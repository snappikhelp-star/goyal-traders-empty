import { Router, type IRouter } from "express";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import {
  db,
  bills,
  billItems,
  products,
  inventory,
  customers,
  payments,
  customerPaintShades,
  insertBillSchema,
} from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/bills",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await db
      .select({
        bill: bills,
        customer: customers,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(status ? eq(bills.status, status) : undefined)
      .orderBy(desc(bills.createdAt));
    res.json(rows.map((r) => ({ ...r.bill, customer: r.customer })));
  }),
);

router.get(
  "/bills/outstanding",
  asyncHandler(async (req, res) => {
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const pageSize = 20;

    const rows = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        date: bills.date,
        dueDate: bills.dueDate,
        status: bills.status,
        total: bills.total,
        paidAmount: bills.paidAmount,
        customer: customers,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .where(inArray(bills.status, ["unpaid", "partially_paid", "overdue", "sent"]))
      .orderBy(asc(bills.dueDate), desc(bills.date))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bills)
      .where(inArray(bills.status, ["unpaid", "partially_paid", "overdue", "sent"]));

    const data = rows.map((b) => ({
      ...b,
      remaining: Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
    }));

    res.json({ data, count });
  }),
);

router.get(
  "/bills/:id",
  asyncHandler(async (req, res) => {
    const [bill] = await db.select().from(bills).where(eq(bills.id, (req.params.id as string)));
    if (!bill) throw new HttpError(404, "Bill not found");
    const [customer] = await db.select().from(customers).where(eq(customers.id, bill.customerId));
    const items = await db.select().from(billItems).where(eq(billItems.billId, bill.id));
    res.json({ ...bill, customer, items });
  }),
);

type CreateInvoiceItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  gstRate?: number;
  shadeName?: string;
  shadeCode?: string;
  roomArea?: string;
  houseMappingId?: string;
};

router.post(
  "/bills",
  asyncHandler(async (req, res) => {
    const { items, ...billBody } = req.body as {
      items: CreateInvoiceItem[];
    } & Record<string, unknown>;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, "At least one bill item is required");
    }

    const billData = insertBillSchema.parse(billBody);

    const result = await db.transaction(async (tx) => {
      // Generate bill number
      const [{ nextval }] = (await tx.execute(
        sql`select nextval('bill_number_seq') as nextval`,
      )) as unknown as { nextval: number }[];
      const billNumber = `BILL-${String(nextval).padStart(6, "0")}`;

      let subtotal = 0;
      let discountTotal = 0;
      let gstTotal = 0;

      const preparedItems = [];
      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));
        if (!product) throw new HttpError(404, `Product ${item.productId} not found`);

        const [inv] = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.productId, item.productId))
          .for("update");
        if (!inv) throw new HttpError(400, `No inventory for product ${product.name}`);

        const qty = Number(item.quantity);
        const before = Number(inv.quantity);
        const after = before - qty;
        if (after < 0) {
          throw new HttpError(400, `Insufficient stock for ${product.name}. Available: ${before}`);
        }

        const discount = Number(item.discount ?? 0);
        const gstRate = Number(item.gstRate ?? product.gstRate ?? 0);
        const lineBase = qty * Number(item.unitPrice) - discount;
        const gstAmount = Math.round(lineBase * (gstRate / 100) * 100) / 100;
        const total = Math.round((lineBase + gstAmount) * 100) / 100;

        subtotal += qty * Number(item.unitPrice);
        discountTotal += discount;
        gstTotal += gstAmount;

        preparedItems.push({
          productId: item.productId,
          productName: product.name,
          brand: product.brand,
          shadeNumber: product.shadeNumber,
          packSize: product.packSize,
          quantity: String(qty),
          unitPrice: String(item.unitPrice),
          discount: String(discount),
          gstRate: String(gstRate),
          gstAmount: String(gstAmount),
          total: String(total),
        });

        await tx
          .update(inventory)
          .set({ quantity: String(after), lastUpdated: new Date() })
          .where(eq(inventory.productId, item.productId));

        await tx.execute(
          sql`insert into inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, notes)
              values (${item.productId}, 'sale', ${-qty}, ${before}, ${after}, 'bill', 'Sold via invoice')`,
        );

        if (item.shadeName || item.shadeCode || product.shadeName || product.shadeNumber) {
          await tx.insert(customerPaintShades).values({
            customerId: billData.customerId,
            houseMappingId: item.houseMappingId ?? null,
            brand: product.brand ?? null,
            shadeName: item.shadeName ?? product.shadeName ?? product.name,
            shadeCode: item.shadeCode ?? product.shadeNumber ?? null,
            roomArea: item.roomArea ?? null,
            appliedDate: typeof billData.date === "string" ? billData.date : undefined,
          });
        }
      }

      const grandTotal = Math.round((subtotal - discountTotal + gstTotal) * 100) / 100;

      const [bill] = await tx
        .insert(bills)
        .values({
          ...billData,
          billNumber,
          subtotal: String(subtotal),
          discount: String(discountTotal),
          tax: String(gstTotal),
          total: String(grandTotal),
        })
        .returning();

      const insertedItems = await tx
        .insert(billItems)
        .values(preparedItems.map((i) => ({ ...i, billId: bill.id })))
        .returning();

      const paidAmount = Number(bill.paidAmount ?? 0);
      if (paidAmount > 0) {
        await tx.insert(payments).values({
          billId: bill.id,
          customerId: bill.customerId,
          amount: String(paidAmount),
          paymentMethod: bill.paymentMethod,
          paymentDate: bill.date,
        });
      }

      await tx
        .update(customers)
        .set({ lastPurchaseDate: sql`current_date` })
        .where(eq(customers.id, bill.customerId));

      return { ...bill, items: insertedItems };
    });

    res.status(201).json({
      ...result,
      success: true,
      bill_id: result.id,
      bill_number: result.billNumber,
      total: Number(result.total),
      paid_amount: Number(result.paidAmount),
      pending: Math.max(Number(result.total) - Number(result.paidAmount), 0),
      status: result.status,
    });
  }),
);

router.put(
  "/bills/:id",
  asyncHandler(async (req, res) => {
    const data = insertBillSchema.partial().parse(req.body);
    const [row] = await db
      .update(bills)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bills.id, (req.params.id as string)))
      .returning();
    if (!row) throw new HttpError(404, "Bill not found");
    res.json(row);
  }),
);

router.delete(
  "/bills/:id",
  asyncHandler(async (req, res) => {
    await db.delete(bills).where(eq(bills.id, (req.params.id as string)));
    res.status(204).end();
  }),
);

export default router;
