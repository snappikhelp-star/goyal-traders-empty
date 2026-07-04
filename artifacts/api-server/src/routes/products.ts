import { Router, type IRouter } from "express";
import { eq, desc, or, ilike, and, lte, sql } from "drizzle-orm";
import { db, products, inventory, inventoryTransactions, insertProductSchema } from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" && req.query.category !== "all" ? req.query.category : undefined;
    const brand = typeof req.query.brand === "string" && req.query.brand !== "all" ? req.query.brand : undefined;
    const isActiveParam = typeof req.query.isActive === "string" ? req.query.isActive : undefined;
    const activeOnly = req.query.activeOnly === "true";
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : undefined;
    const pageSize = req.query.pageSize ? Math.max(1, Number(req.query.pageSize)) : 20;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.shadeNumber, `%${search}%`),
          ilike(products.barcode, `%${search}%`),
        ),
      );
    }
    if (category) conditions.push(eq(products.category, category));
    if (brand) conditions.push(eq(products.brand, brand));
    if (activeOnly || isActiveParam === "active") conditions.push(eq(products.isActive, true));
    if (isActiveParam === "inactive") conditions.push(eq(products.isActive, false));
    const where = conditions.length ? and(...conditions) : undefined;

    if (page === undefined) {
      const rows = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(activeOnly ? 30 : 1000);
      res.json(rows);
      return;
    }

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          product: products,
          inv: { quantity: inventory.quantity, minQuantity: inventory.minQuantity, reorderLevel: inventory.reorderLevel },
        })
        .from(products)
        .leftJoin(inventory, eq(inventory.productId, products.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);

    const data = rows.map((r) => ({ ...r.product, inventory: r.inv.quantity !== null ? r.inv : null }));
    res.json({ data, count });
  }),
);

router.get(
  "/products/filter-options",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({ category: products.category, brand: products.brand })
      .from(products)
      .where(eq(products.isActive, true));
    const categories = Array.from(new Set(rows.map((r) => r.category).filter((v): v is string => !!v))).sort();
    const brands = Array.from(new Set(rows.map((r) => r.brand).filter((v): v is string => !!v))).sort();
    res.json({ categories, brands });
  }),
);

router.get(
  "/products/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        brand: products.brand,
        category: products.category,
        shadeNumber: products.shadeNumber,
        packSize: products.packSize,
        price: products.price,
        gstRate: products.gstRate,
        quantity: inventory.quantity,
      })
      .from(products)
      .innerJoin(inventory, eq(inventory.productId, products.id))
      .where(
        and(
          eq(products.isActive, true),
          q
            ? or(
                ilike(products.name, `%${q}%`),
                ilike(products.sku, `%${q}%`),
                ilike(products.brand, `%${q}%`),
                ilike(products.shadeNumber, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(30);
    res.json(rows);
  }),
);

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(products).where(eq(products.id, (req.params.id as string)));
    if (!row) throw new HttpError(404, "Product not found");
    res.json(row);
  }),
);

router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const data = insertProductSchema.parse(req.body);
    const row = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values(data).returning();
      await tx.insert(inventory).values({ productId: product.id }).onConflictDoNothing();
      return product;
    });
    res.status(201).json(row);
  }),
);

router.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const data = insertProductSchema.partial().parse(req.body);
    const [row] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, (req.params.id as string)))
      .returning();
    if (!row) throw new HttpError(404, "Product not found");
    res.json(row);
  }),
);

router.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    await db.update(products).set({ isActive: false }).where(eq(products.id, (req.params.id as string)));
    res.status(204).end();
  }),
);

// ── Inventory ─────────────────────────────────────────────────────────
router.get(
  "/inventory/stats",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        quantity: inventory.quantity,
        minQuantity: inventory.minQuantity,
        price: products.price,
        purchasePrice: products.purchasePrice,
        isActive: products.isActive,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id));

    let outOfStock = 0;
    let lowStock = 0;
    let totalValue = 0;
    let totalQty = 0;
    for (const r of rows) {
      const qty = Number(r.quantity);
      if (qty === 0) outOfStock++;
      else if (qty <= Number(r.minQuantity ?? 0)) lowStock++;
      const pp = Number(r.purchasePrice ?? r.price ?? 0);
      totalValue += qty * pp;
      totalQty += qty;
    }

    res.json({
      totalProducts: rows.length,
      outOfStock,
      lowStock,
      totalStockValue: totalValue,
      totalItems: totalQty,
    });
  }),
);

router.get(
  "/inventory",
  asyncHandler(async (req, res) => {
    const lowStockOnly = req.query.lowStock === "true";
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const alertFilter = typeof req.query.alertFilter === "string" ? req.query.alertFilter : "all";
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : undefined;
    const pageSize = 50;

    const conditions = [];
    if (lowStockOnly) conditions.push(lte(inventory.quantity, inventory.minQuantity));
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.barcode, `%${search}%`),
        ),
      );
    }
    if (alertFilter === "out_of_stock") conditions.push(eq(inventory.quantity, "0"));
    else if (alertFilter === "low_stock") conditions.push(lte(inventory.quantity, inventory.minQuantity));
    const where = conditions.length ? and(...conditions) : undefined;

    let rowsQuery = db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        quantity: inventory.quantity,
        minQuantity: inventory.minQuantity,
        reservedQuantity: inventory.reservedQuantity,
        reorderLevel: inventory.reorderLevel,
        location: inventory.location,
        lastUpdated: inventory.lastUpdated,
        product: products,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(where)
      .orderBy(desc(inventory.lastUpdated))
      .$dynamic();

    if (page !== undefined) {
      rowsQuery = rowsQuery.limit(pageSize).offset((page - 1) * pageSize);
    }

    const [rows, [{ count }]] = await Promise.all([
      rowsQuery,
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(where),
    ]);

    if (page !== undefined) {
      res.json({ data: rows, count });
    } else {
      res.json(rows);
    }
  }),
);

router.post(
  "/inventory/movements",
  asyncHandler(async (req, res) => {
    const { productId, type, quantityChange, notes, referenceType, referenceId } = req.body as {
      productId: string;
      type: "stock_in" | "stock_out" | "adjustment" | "sale" | "return";
      quantityChange: number;
      notes?: string;
      referenceType?: string;
      referenceId?: string;
    };

    if (!productId || !type || quantityChange === undefined) {
      throw new HttpError(400, "productId, type and quantityChange are required");
    }
    if (!["stock_in", "stock_out", "adjustment", "sale", "return"].includes(type)) {
      throw new HttpError(400, `Invalid transaction_type "${type}"`);
    }

    const userId = (req.user as any)?.claims?.sub;

    const result = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .for("update");

      if (!inv) {
        throw new HttpError(404, "No inventory record found for this product.");
      }

      const before = Number(inv.quantity);
      const after = before + Number(quantityChange);

      if (after < 0) {
        throw new HttpError(
          400,
          `Insufficient stock. Available: ${before}, requested out: ${Math.abs(Number(quantityChange))}`,
        );
      }

      await tx
        .update(inventory)
        .set({ quantity: String(after), lastUpdated: new Date() })
        .where(eq(inventory.productId, productId));

      await tx.insert(inventoryTransactions).values({
        productId,
        transactionType: type,
        quantityChange: String(quantityChange),
        quantityBefore: String(before),
        quantityAfter: String(after),
        referenceType,
        referenceId,
        notes,
        performedBy: userId,
      });

      return { success: true, quantityBefore: before, quantityAfter: after, quantityChange };
    });

    res.json(result);
  }),
);

router.get(
  "/inventory/transactions",
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const txType = typeof req.query.txType === "string" && req.query.txType !== "all" ? req.query.txType : undefined;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const pageSize = 30;

    const conditions = [];
    if (productId) conditions.push(eq(inventoryTransactions.productId, productId));
    if (txType) conditions.push(eq(inventoryTransactions.transactionType, txType));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({ tx: inventoryTransactions, product: { name: products.name, sku: products.sku, unit: products.unit } })
        .from(inventoryTransactions)
        .innerJoin(products, eq(inventoryTransactions.productId, products.id))
        .where(where)
        .orderBy(desc(inventoryTransactions.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(inventoryTransactions).where(where),
    ]);

    res.json({ data: rows.map((r) => ({ ...r.tx, product: r.product })), count });
  }),
);

router.get(
  "/inventory/:productId/transactions",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.productId, (req.params.productId as string)))
      .orderBy(desc(inventoryTransactions.createdAt));
    res.json(rows);
  }),
);

router.put(
  "/inventory/:productId",
  asyncHandler(async (req, res) => {
    const { minQuantity, reorderLevel, location } = req.body as {
      minQuantity?: number;
      reorderLevel?: number;
      location?: string | null;
    };
    const [row] = await db
      .update(inventory)
      .set({
        ...(minQuantity !== undefined ? { minQuantity: String(minQuantity) } : {}),
        ...(reorderLevel !== undefined ? { reorderLevel: String(reorderLevel) } : {}),
        ...(location !== undefined ? { location: location?.trim() || null } : {}),
        lastUpdated: new Date(),
      })
      .where(eq(inventory.productId, (req.params.productId as string)))
      .returning();
    if (!row) throw new HttpError(404, "Inventory record not found");
    res.json(row);
  }),
);

export default router;
