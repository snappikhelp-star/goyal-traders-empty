import { Router, type IRouter } from "express";
import { eq, desc, gte, ne } from "drizzle-orm";
import {
  db,
  purchases,
  purchaseItems,
  purchasePayments,
  companies,
  insertPurchaseSchema,
  insertPurchasePaymentSchema,
} from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/purchases",
  asyncHandler(async (req, res) => {
    const companyId = typeof req.query.companyId === "string" ? req.query.companyId : undefined;
    const rows = await db
      .select({ purchase: purchases, company: companies })
      .from(purchases)
      .leftJoin(companies, eq(purchases.companyId, companies.id))
      .where(companyId ? eq(purchases.companyId, companyId) : undefined)
      .orderBy(desc(purchases.createdAt));
    res.json(rows.map((r) => ({ ...r.purchase, company: r.company })));
  }),
);

router.get(
  "/purchases/stats",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({ grandTotal: purchases.grandTotal, dueAmount: purchases.dueAmount, invoiceDate: purchases.invoiceDate })
      .from(purchases);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    let totalPurchase = 0;
    let totalDue = 0;
    let monthPurchase = 0;
    for (const r of rows) {
      totalPurchase += Number(r.grandTotal);
      totalDue += Number(r.dueAmount);
      if (r.invoiceDate >= monthStart) monthPurchase += Number(r.grandTotal);
    }
    res.json({ totalPurchase, totalDue, monthPurchase });
  }),
);

router.get(
  "/purchases/recent",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const rows = await db
      .select({ purchase: purchases, company: companies })
      .from(purchases)
      .leftJoin(companies, eq(purchases.companyId, companies.id))
      .orderBy(desc(purchases.invoiceDate))
      .limit(limit);
    res.json(rows.map((r) => ({ ...r.purchase, company: r.company })));
  }),
);

router.get(
  "/purchases/payment-stats",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({ amount: purchasePayments.amount, paymentDate: purchasePayments.paymentDate })
      .from(purchasePayments);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    let paymentsThisMonth = 0;
    for (const r of rows) {
      if (r.paymentDate >= monthStart) paymentsThisMonth += Number(r.amount);
    }
    res.json({ paymentsThisMonth });
  }),
);

router.get(
  "/purchases/recent-payments",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const rows = await db
      .select({ payment: purchasePayments, purchase: purchases, company: companies })
      .from(purchasePayments)
      .leftJoin(purchases, eq(purchasePayments.purchaseId, purchases.id))
      .leftJoin(companies, eq(purchasePayments.companyId, companies.id))
      .orderBy(desc(purchasePayments.paymentDate))
      .limit(limit);
    res.json(rows.map((r) => ({ ...r.payment, purchase: r.purchase, company: r.company })));
  }),
);

router.get(
  "/purchases/:id",
  asyncHandler(async (req, res) => {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, (req.params.id as string)));
    if (!purchase) throw new HttpError(404, "Purchase not found");
    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchase.id));
    const paymentsList = await db
      .select()
      .from(purchasePayments)
      .where(eq(purchasePayments.purchaseId, purchase.id));
    res.json({ ...purchase, items, payments: paymentsList });
  }),
);

type PurchaseItemInput = {
  productId?: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  gstPercent?: number;
  discountPercent?: number;
};

router.post(
  "/purchases",
  asyncHandler(async (req, res) => {
    const { items, ...body } = req.body as { items: PurchaseItemInput[] } & Record<string, unknown>;
    if (!items || items.length === 0) throw new HttpError(400, "At least one item is required");

    const data = insertPurchaseSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      let subtotal = 0;
      let gstTotal = 0;
      const prepared = items.map((item) => {
        const qty = Number(item.quantity);
        const price = Number(item.purchasePrice);
        const discountPct = Number(item.discountPercent ?? 0);
        const gstPct = Number(item.gstPercent ?? 0);
        const base = qty * price * (1 - discountPct / 100);
        const gstAmount = Math.round(base * (gstPct / 100) * 100) / 100;
        const lineTotal = Math.round((base + gstAmount) * 100) / 100;
        subtotal += base;
        gstTotal += gstAmount;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: String(qty),
          purchasePrice: String(price),
          gstPercent: String(gstPct),
          discountPercent: String(discountPct),
          lineTotal: String(lineTotal),
        };
      });

      const grandTotal = Math.round((subtotal + gstTotal) * 100) / 100;
      const paidAmount = Number(data.paidAmount ?? 0);
      const dueAmount = Math.round((grandTotal - paidAmount) * 100) / 100;
      const status = dueAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "due";

      const [purchase] = await tx
        .insert(purchases)
        .values({
          ...data,
          subtotal: String(subtotal),
          gstAmount: String(gstTotal),
          grandTotal: String(grandTotal),
          paidAmount: String(paidAmount),
          dueAmount: String(dueAmount),
          status,
        })
        .returning();

      const insertedItems = await tx
        .insert(purchaseItems)
        .values(prepared.map((p) => ({ ...p, purchaseId: purchase.id })))
        .returning();

      if (purchase.companyId) {
        const [company] = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, purchase.companyId))
          .for("update");
        if (company) {
          await tx
            .update(companies)
            .set({
              totalPurchase: String(Number(company.totalPurchase) + grandTotal),
              totalPaid: String(Number(company.totalPaid) + paidAmount),
              outstandingDue: String(Number(company.outstandingDue) + dueAmount),
              lastPurchaseDate: purchase.invoiceDate,
            })
            .where(eq(companies.id, company.id));
        }
      }

      return { ...purchase, items: insertedItems };
    });

    res.status(201).json(result);
  }),
);

router.post(
  "/purchases/:id/payments",
  asyncHandler(async (req, res) => {
    const data = insertPurchasePaymentSchema.parse({ ...req.body, purchaseId: (req.params.id as string) });

    const result = await db.transaction(async (tx) => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.id, (req.params.id as string)))
        .for("update");
      if (!purchase) throw new HttpError(404, "Purchase not found");

      const [payment] = await tx.insert(purchasePayments).values(data).returning();

      const newPaid = Number(purchase.paidAmount) + Number(payment.amount);
      const newDue = Math.max(0, Number(purchase.grandTotal) - newPaid);
      const status = newDue <= 0 ? "paid" : newPaid > 0 ? "partial" : "due";

      await tx
        .update(purchases)
        .set({ paidAmount: String(newPaid), dueAmount: String(newDue), status, updatedAt: new Date() })
        .where(eq(purchases.id, purchase.id));

      if (purchase.companyId) {
        const [company] = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, purchase.companyId))
          .for("update");
        if (company) {
          await tx
            .update(companies)
            .set({
              totalPaid: String(Number(company.totalPaid) + Number(payment.amount)),
              outstandingDue: String(Math.max(0, Number(company.outstandingDue) - Number(payment.amount))),
              lastPaymentDate: payment.paymentDate,
            })
            .where(eq(companies.id, company.id));
        }
      }

      return payment;
    });

    res.status(201).json(result);
  }),
);

router.get(
  "/purchases/:id/payments",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(purchasePayments)
      .where(eq(purchasePayments.purchaseId, (req.params.id as string)))
      .orderBy(desc(purchasePayments.paymentDate));
    res.json(rows);
  }),
);

async function recomputeCompanyStats(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], companyId: string) {
  const rows = await tx
    .select({ grandTotal: purchases.grandTotal, paidAmount: purchases.paidAmount, dueAmount: purchases.dueAmount, invoiceDate: purchases.invoiceDate })
    .from(purchases)
    .where(eq(purchases.companyId, companyId));

  let totalPurchase = 0;
  let totalPaid = 0;
  let outstandingDue = 0;
  let lastPurchaseDate: string | null = null;
  for (const r of rows) {
    totalPurchase += Number(r.grandTotal);
    totalPaid += Number(r.paidAmount);
    outstandingDue += Number(r.dueAmount);
    if (!lastPurchaseDate || r.invoiceDate > lastPurchaseDate) lastPurchaseDate = r.invoiceDate;
  }

  const paymentRows = await tx
    .select({ paymentDate: purchasePayments.paymentDate })
    .from(purchasePayments)
    .where(eq(purchasePayments.companyId, companyId));
  let lastPaymentDate: string | null = null;
  for (const r of paymentRows) {
    if (!lastPaymentDate || r.paymentDate > lastPaymentDate) lastPaymentDate = r.paymentDate;
  }

  await tx
    .update(companies)
    .set({ totalPurchase: String(totalPurchase), totalPaid: String(totalPaid), outstandingDue: String(outstandingDue), lastPurchaseDate, lastPaymentDate })
    .where(eq(companies.id, companyId));
}

router.put(
  "/purchases/:id",
  asyncHandler(async (req, res) => {
    const { items, ...body } = req.body as { items?: PurchaseItemInput[] } & Record<string, unknown>;
    const data = insertPurchaseSchema.partial().parse(body);

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(purchases).where(eq(purchases.id, (req.params.id as string))).for("update");
      if (!existing) throw new HttpError(404, "Purchase not found");

      let updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };

      if (items && items.length > 0) {
        let subtotal = 0;
        let gstTotal = 0;
        const prepared = items.map((item) => {
          const qty = Number(item.quantity);
          const price = Number(item.purchasePrice);
          const discountPct = Number(item.discountPercent ?? 0);
          const gstPct = Number(item.gstPercent ?? 0);
          const base = qty * price * (1 - discountPct / 100);
          const gstAmount = Math.round(base * (gstPct / 100) * 100) / 100;
          const lineTotal = Math.round((base + gstAmount) * 100) / 100;
          subtotal += base;
          gstTotal += gstAmount;
          return {
            productId: item.productId,
            productName: item.productName,
            quantity: String(qty),
            purchasePrice: String(price),
            gstPercent: String(gstPct),
            discountPercent: String(discountPct),
            lineTotal: String(lineTotal),
          };
        });

        const grandTotal = Math.round((subtotal + gstTotal) * 100) / 100;
        const paidAmount = Number(data.paidAmount ?? existing.paidAmount);
        const dueAmount = Math.round((grandTotal - paidAmount) * 100) / 100;
        const status = dueAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "due";

        updateData = {
          ...updateData,
          subtotal: String(subtotal),
          gstAmount: String(gstTotal),
          grandTotal: String(grandTotal),
          paidAmount: String(paidAmount),
          dueAmount: String(dueAmount),
          status,
        };

        await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, existing.id));
        await tx.insert(purchaseItems).values(prepared.map((p) => ({ ...p, purchaseId: existing.id })));
      }

      const [updated] = await tx
        .update(purchases)
        .set(updateData)
        .where(eq(purchases.id, existing.id))
        .returning();

      const companyId = (updateData.companyId as string | undefined) ?? existing.companyId;
      if (companyId) await recomputeCompanyStats(tx, companyId);

      const finalItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, existing.id));
      return { ...updated, items: finalItems };
    });

    res.json(result);
  }),
);

router.delete(
  "/purchases/:id",
  asyncHandler(async (req, res) => {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(purchases).where(eq(purchases.id, (req.params.id as string))).for("update");
      if (!existing) throw new HttpError(404, "Purchase not found");
      await tx.delete(purchasePayments).where(eq(purchasePayments.purchaseId, existing.id));
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, existing.id));
      await tx.delete(purchases).where(eq(purchases.id, existing.id));
      if (existing.companyId) await recomputeCompanyStats(tx, existing.companyId);
    });
    res.status(204).end();
  }),
);

router.delete(
  "/purchases/:purchaseId/payments/:paymentId",
  asyncHandler(async (req, res) => {
    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(purchasePayments)
        .where(eq(purchasePayments.id, (req.params.paymentId as string)))
        .for("update");
      if (!payment) throw new HttpError(404, "Payment not found");

      await tx.delete(purchasePayments).where(eq(purchasePayments.id, payment.id));

      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.id, payment.purchaseId))
        .for("update");
      if (purchase) {
        const newPaid = Math.max(0, Number(purchase.paidAmount) - Number(payment.amount));
        const newDue = Math.max(0, Number(purchase.grandTotal) - newPaid);
        const status = newPaid <= 0 ? "due" : newDue <= 0 ? "paid" : "partial";
        await tx
          .update(purchases)
          .set({ paidAmount: String(newPaid), dueAmount: String(newDue), status, updatedAt: new Date() })
          .where(eq(purchases.id, purchase.id));

        if (purchase.companyId) await recomputeCompanyStats(tx, purchase.companyId);
      }
    });
    res.status(204).end();
  }),
);

export default router;
