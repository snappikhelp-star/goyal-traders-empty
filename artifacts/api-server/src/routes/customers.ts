import { Router, type IRouter } from "express";
import { eq, desc, asc, or, ilike, and, ne, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  customers,
  customerNotes,
  customerPhotos,
  houseMappings,
  customerPaintShades,
  bills,
  payments,
  insertCustomerSchema,
  insertCustomerNoteSchema,
  insertHouseMappingSchema,
  insertCustomerPhotoSchema,
  insertCustomerPaintShadeSchema,
} from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/customers/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const rows = await db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, city: customers.city })
      .from(customers)
      .where(
        q
          ? or(
              ilike(customers.name, `%${q}%`),
              ilike(customers.phone, `%${q}%`),
              ilike(customers.alternateMobile, `%${q}%`),
            )
          : undefined,
      )
      .orderBy(asc(customers.name))
      .limit(20);
    res.json(rows);
  }),
);

const CUSTOMER_SORT_COLUMNS = {
  name: customers.name,
  phone: customers.phone,
  city: customers.city,
  created_at: customers.createdAt,
  last_purchase_date: customers.lastPurchaseDate,
} as const;

router.get(
  "/customers",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const pageSize = req.query.pageSize ? Math.max(1, Number(req.query.pageSize)) : 15;
    const sortFieldParam = typeof req.query.sortField === "string" ? req.query.sortField : "name";
    const sortAsc = req.query.sortAsc !== "false";
    const sortColumn =
      CUSTOMER_SORT_COLUMNS[sortFieldParam as keyof typeof CUSTOMER_SORT_COLUMNS] ?? customers.name;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.alternateMobile, `%${search}%`),
          ilike(customers.address, `%${search}%`),
          ilike(customers.city, `%${search}%`),
        ),
      );
    }
    if (city) conditions.push(ilike(customers.city, `%${city}%`));
    if (state) conditions.push(eq(customers.state, state));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(where)
        .orderBy(sortAsc ? asc(sortColumn) : desc(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);

    res.json({ customers: rows, total: count });
  }),
);

router.get(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(customers).where(eq(customers.id, (req.params.id as string)));
    if (!row) throw new HttpError(404, "Customer not found");
    res.json(row);
  }),
);

router.post(
  "/customers",
  asyncHandler(async (req, res) => {
    const data = insertCustomerSchema.parse(req.body);
    const [row] = await db.insert(customers).values(data).returning();
    res.status(201).json(row);
  }),
);

router.put(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const data = insertCustomerSchema.partial().parse(req.body);
    const [row] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, (req.params.id as string)))
      .returning();
    if (!row) throw new HttpError(404, "Customer not found");
    res.json(row);
  }),
);

router.delete(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    await db.delete(customers).where(eq(customers.id, (req.params.id as string)));
    res.status(204).end();
  }),
);

// ── Bills for a customer ─────────────────────────────────────────────
router.get(
  "/customers/:id/bills",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.customerId, (req.params.id as string)))
      .orderBy(desc(bills.date));
    res.json(rows);
  }),
);

// ── Stats ─────────────────────────────────────────────────────────────
router.get(
  "/customers/:id/stats",
  asyncHandler(async (req, res) => {
    const customerId = req.params.id as string;
    const rows = await db
      .select({ total: bills.total, paidAmount: bills.paidAmount, status: bills.status, date: bills.date })
      .from(bills)
      .where(eq(bills.customerId, customerId));

    const nonCancelled = rows.filter((b) => b.status !== "cancelled");
    const totalBills = nonCancelled.length;
    const totalSpent = nonCancelled.reduce((s, b) => s + Number(b.total), 0);
    const pendingAmount = nonCancelled.reduce(
      (s, b) => s + Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
      0,
    );
    const totalPaid = totalSpent - pendingAmount;
    const dates = nonCancelled.map((b) => b.date).sort();

    res.json({
      totalBills,
      totalSpent,
      totalPaid,
      pendingAmount,
      firstPurchase: dates[0] ?? null,
      lastPurchase: dates[dates.length - 1] ?? null,
    });
  }),
);

// ── Ledger (bills + payments combined, running balance) ──────────────
router.get(
  "/customers/:id/ledger",
  asyncHandler(async (req, res) => {
    const customerId = req.params.id as string;

    const billRows = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        date: bills.date,
        total: bills.total,
        paidAmount: bills.paidAmount,
        status: bills.status,
      })
      .from(bills)
      .where(and(eq(bills.customerId, customerId), ne(bills.status, "cancelled")))
      .orderBy(asc(bills.date));

    const validBillIds = new Set(billRows.map((b) => b.id));

    const paymentRows = await db
      .select({
        id: payments.id,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        reference: payments.reference,
        notes: payments.notes,
        billId: payments.billId,
      })
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(asc(payments.paymentDate));

    const billNumberById = new Map(billRows.map((b) => [b.id, b.billNumber]));
    const filteredPayments = paymentRows.filter((p) => p.billId === null || validBillIds.has(p.billId));

    const combined: Array<{ date: string; tiebreak: number; type: "invoice" | "payment"; data: unknown }> = [
      ...billRows.map((b) => ({ date: b.date, tiebreak: 0, type: "invoice" as const, data: b })),
      ...filteredPayments.map((p) => ({ date: p.paymentDate, tiebreak: 1, type: "payment" as const, data: p })),
    ];

    combined.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.tiebreak - b.tiebreak;
    });

    let balance = 0;
    const ledger = combined.map((e) => {
      if (e.type === "invoice") {
        const b = e.data as (typeof billRows)[number];
        balance += Number(b.total);
        return {
          id: b.id,
          date: b.date,
          type: "invoice" as const,
          billNumber: b.billNumber,
          billId: b.id,
          invoiceTotal: Number(b.total),
          paidOnInvoice: Number(b.paidAmount),
          dueOnInvoice: Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
          status: b.status,
          balance,
        };
      }
      const p = e.data as (typeof paymentRows)[number];
      balance -= Number(p.amount);
      return {
        id: p.id,
        date: p.paymentDate,
        type: "payment" as const,
        paymentAmount: Number(p.amount),
        method: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
        billNumber: p.billId ? billNumberById.get(p.billId) : undefined,
        billId: p.billId ?? undefined,
        balance,
      };
    });

    res.json(ledger);
  }),
);

// ── Monthly trend (last 6 months) ─────────────────────────────────────
router.get(
  "/customers/:id/monthly-trend",
  asyncHandler(async (req, res) => {
    const customerId = req.params.id as string;
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = sixMonthsAgo.toISOString().split("T")[0];

    const [billRows, paymentRows] = await Promise.all([
      db
        .select({ date: bills.date, total: bills.total })
        .from(bills)
        .where(and(eq(bills.customerId, customerId), gte(bills.date, startDate), ne(bills.status, "cancelled"))),
      db
        .select({ paymentDate: payments.paymentDate, amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.customerId, customerId), gte(payments.paymentDate, startDate))),
    ]);

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        purchases: 0,
        payments: 0,
      };
    });

    for (const b of billRows) {
      const key = b.date.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.purchases += Number(b.total);
    }
    for (const p of paymentRows) {
      const key = p.paymentDate.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.payments += Number(p.amount);
    }

    res.json(months.map(({ key: _k, ...rest }) => rest));
  }),
);

// ── Outstanding bills (for record-payment dialog) ─────────────────────
router.get(
  "/customers/:id/outstanding-bills",
  asyncHandler(async (req, res) => {
    const customerId = req.params.id as string;
    const rows = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        date: bills.date,
        total: bills.total,
        paidAmount: bills.paidAmount,
        status: bills.status,
      })
      .from(bills)
      .where(
        and(
          eq(bills.customerId, customerId),
          inArray(bills.status, ["unpaid", "partially_paid", "overdue", "sent"]),
        ),
      )
      .orderBy(desc(bills.date));

    res.json(
      rows.map((b) => ({
        ...b,
        due: Math.max(Number(b.total) - Number(b.paidAmount ?? 0), 0),
      })),
    );
  }),
);

// ── Notes ──────────────────────────────────────────────────────────────
router.get(
  "/customers/:id/notes",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, (req.params.id as string)))
      .orderBy(desc(customerNotes.createdAt));
    res.json(rows);
  }),
);

router.post(
  "/customers/:id/notes",
  asyncHandler(async (req, res) => {
    const data = insertCustomerNoteSchema.parse({ ...req.body, customerId: (req.params.id as string) });
    const userId = (req.user as any)?.claims?.sub;
    const [row] = await db
      .insert(customerNotes)
      .values({ ...data, createdBy: userId })
      .returning();
    res.status(201).json(row);
  }),
);

router.delete(
  "/customers/:id/notes/:noteId",
  asyncHandler(async (req, res) => {
    await db.delete(customerNotes).where(eq(customerNotes.id, (req.params.noteId as string)));
    res.status(204).end();
  }),
);

// ── House mappings ────────────────────────────────────────────────────
router.get(
  "/customers/:id/house-mappings",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(houseMappings)
      .where(eq(houseMappings.customerId, (req.params.id as string)))
      .orderBy(desc(houseMappings.createdAt));
    res.json(rows);
  }),
);

router.post(
  "/customers/:id/house-mappings",
  asyncHandler(async (req, res) => {
    const data = insertHouseMappingSchema.parse({ ...req.body, customerId: (req.params.id as string) });
    const [row] = await db.insert(houseMappings).values(data).returning();
    res.status(201).json(row);
  }),
);

// ── Photos ────────────────────────────────────────────────────────────
router.get(
  "/customers/:id/photos",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(customerPhotos)
      .where(eq(customerPhotos.customerId, (req.params.id as string)))
      .orderBy(desc(customerPhotos.createdAt));
    res.json(rows);
  }),
);

router.post(
  "/customers/:id/photos",
  asyncHandler(async (req, res) => {
    const data = insertCustomerPhotoSchema.parse({ ...req.body, customerId: (req.params.id as string) });
    const [row] = await db.insert(customerPhotos).values(data).returning();
    res.status(201).json(row);
  }),
);

router.delete(
  "/customers/:id/photos/:photoId",
  asyncHandler(async (req, res) => {
    await db.delete(customerPhotos).where(eq(customerPhotos.id, (req.params.photoId as string)));
    res.status(204).end();
  }),
);

// ── Paint shades ──────────────────────────────────────────────────────
router.get(
  "/customers/:id/paint-shades",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(customerPaintShades)
      .where(eq(customerPaintShades.customerId, (req.params.id as string)))
      .orderBy(desc(customerPaintShades.createdAt));
    res.json(rows);
  }),
);

router.post(
  "/customers/:id/paint-shades",
  asyncHandler(async (req, res) => {
    const data = insertCustomerPaintShadeSchema.parse({ ...req.body, customerId: (req.params.id as string) });
    const [row] = await db.insert(customerPaintShades).values(data).returning();
    res.status(201).json(row);
  }),
);

export default router;
