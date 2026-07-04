import { Router, type IRouter } from "express";
import { eq, desc, gte, lte, and, sql, or, ilike } from "drizzle-orm";
import { db, payments, bills, customers, insertPaymentSchema } from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/payments/stats",
  asyncHandler(async (_req, res) => {
    const todayStr = new Date().toISOString().split("T")[0];

    const [pendingBills, todayPaymentRows, overdueRows] = await Promise.all([
      db
        .select({ total: bills.total, paidAmount: bills.paidAmount })
        .from(bills)
        .where(sql`${bills.status} != 'cancelled' and ${bills.status} != 'paid'`),
      db.select({ amount: payments.amount }).from(payments).where(eq(payments.paymentDate, todayStr)),
      db.select({ total: bills.total, paidAmount: bills.paidAmount }).from(bills).where(eq(bills.status, "overdue")),
    ]);

    const totalOutstanding = pendingBills.reduce(
      (s, b) => s + Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
      0,
    );
    const collectedToday = todayPaymentRows.reduce((s, r) => s + Number(r.amount), 0);
    const overdueBills = overdueRows.length;
    const overdueAmount = overdueRows.reduce(
      (s, b) => s + Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
      0,
    );

    res.json({ totalOutstanding, collectedToday, overdueBills, overdueAmount });
  }),
);

router.get(
  "/payments/daily",
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];
    const rows = await db
      .select({ payment: payments, customer: customers, bill: bills })
      .from(payments)
      .innerJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(bills, eq(payments.billId, bills.id))
      .where(eq(payments.paymentDate, date))
      .orderBy(desc(payments.createdAt));
    res.json(rows.map((r) => ({ ...r.payment, customer: r.customer, bill: r.bill ?? null })));
  }),
);

router.get(
  "/payments/monthly",
  asyncHandler(async (req, res) => {
    const year = typeof req.query.year === "string" ? Number(req.query.year) : new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const rows = await db
      .select({ amount: payments.amount, paymentDate: payments.paymentDate, paymentMethod: payments.paymentMethod })
      .from(payments)
      .where(and(gte(payments.paymentDate, start), lte(payments.paymentDate, end)));

    const months: Record<string, { month: string; monthName: string; total: number; count: number; byMethod: Record<string, number> }> = {};
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, "0");
      months[key] = {
        month: key,
        monthName: new Date(year, m - 1, 1).toLocaleDateString("en-IN", { month: "long" }),
        total: 0,
        count: 0,
        byMethod: {},
      };
    }
    for (const r of rows) {
      const m = r.paymentDate.slice(5, 7);
      if (!months[m]) continue;
      months[m].total += Number(r.amount);
      months[m].count += 1;
      months[m].byMethod[r.paymentMethod] = (months[m].byMethod[r.paymentMethod] ?? 0) + Number(r.amount);
    }
    res.json(Object.values(months));
  }),
);

router.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
    const method = typeof req.query.method === "string" && req.query.method !== "all" ? req.query.method : undefined;
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : undefined;
    const pageSize = req.query.pageSize ? Math.max(1, Number(req.query.pageSize)) : 25;

    const conditions = [];
    if (customerId) conditions.push(eq(payments.customerId, customerId));
    if (method) conditions.push(eq(payments.paymentMethod, method));
    if (dateFrom) conditions.push(gte(payments.paymentDate, dateFrom));
    if (dateTo) conditions.push(lte(payments.paymentDate, dateTo));
    if (search) {
      conditions.push(or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`)));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    let query = db
      .select({ payment: payments, customer: customers, bill: bills })
      .from(payments)
      .innerJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(bills, eq(payments.billId, bills.id))
      .where(where)
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
      .$dynamic();

    if (page !== undefined) {
      query = query.limit(pageSize).offset((page - 1) * pageSize);
    }

    const [rows, [{ count }]] = await Promise.all([
      query,
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .innerJoin(customers, eq(payments.customerId, customers.id))
        .where(where),
    ]);

    const data = rows.map((r) => ({ ...r.payment, customer: r.customer, bill: r.bill ?? null }));

    if (page !== undefined) {
      res.json({ data, count });
    } else {
      res.json(data);
    }
  }),
);

router.post(
  "/payments",
  asyncHandler(async (req, res) => {
    const data = insertPaymentSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values(data).returning();

      let updatedBill: typeof bills.$inferSelect | undefined;
      if (payment.billId) {
        const [bill] = await tx.select().from(bills).where(eq(bills.id, payment.billId)).for("update");
        if (!bill) throw new HttpError(404, "Bill not found");
        const newPaid = Number(bill.paidAmount) + Number(payment.amount);
        const status = newPaid >= Number(bill.total) ? "paid" : newPaid > 0 ? "partially_paid" : bill.status;
        const [saved] = await tx
          .update(bills)
          .set({ paidAmount: String(newPaid), status, updatedAt: new Date() })
          .where(eq(bills.id, bill.id))
          .returning();
        updatedBill = saved;
      }

      return { payment, bill: updatedBill };
    });

    const total = result.bill ? Number(result.bill.total) : 0;
    const paidAmount = result.bill ? Number(result.bill.paidAmount) : Number(result.payment.amount);

    res.status(201).json({
      ...result.payment,
      success: true,
      payment_id: result.payment.id,
      bill_id: result.payment.billId,
      customer_id: result.payment.customerId,
      bill_number: result.bill?.billNumber ?? null,
      amount: Number(result.payment.amount),
      paid_amount: paidAmount,
      remaining: Math.max(total - paidAmount, 0),
      new_status: result.bill?.status ?? null,
    });
  }),
);

router.delete(
  "/payments/:id",
  asyncHandler(async (req, res) => {
    await db.delete(payments).where(eq(payments.id, (req.params.id as string)));
    res.status(204).end();
  }),
);

export default router;
