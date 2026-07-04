import { Router, type IRouter } from "express";
import { sql, eq, desc, lte } from "drizzle-orm";
import { db, customers, products, bills, inventory, payments } from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [[customerCount], [productCount], [pendingBills], [revenue], recentBills, lowStock] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(customers),
        db.select({ count: sql<number>`count(*)::int` }).from(products),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(bills)
          .where(sql`${bills.status} in ('draft', 'sent', 'overdue')`),
        db.select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments),
        db
          .select({ bill: bills, customer: customers })
          .from(bills)
          .innerJoin(customers, eq(bills.customerId, customers.id))
          .orderBy(desc(bills.createdAt))
          .limit(5),
        db
          .select({ inventory, product: products })
          .from(inventory)
          .innerJoin(products, eq(inventory.productId, products.id))
          .where(lte(inventory.quantity, inventory.minQuantity))
          .limit(10),
      ]);

    res.json({
      customerCount: customerCount.count,
      productCount: productCount.count,
      pendingBillsCount: pendingBills.count,
      totalRevenue: revenue.total,
      recentBills: recentBills.map((r) => ({ ...r.bill, customer: r.customer })),
      lowStock: lowStock.map((r) => ({ ...r.inventory, product: r.product })),
    });
  }),
);

router.get(
  "/reports/summary",
  asyncHandler(async (req, res) => {
    const [revenueTotals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${bills.total}), 0)`,
        totalPaid: sql<string>`coalesce(sum(${bills.paidAmount}), 0)`,
      })
      .from(bills);

    const topCustomers = await db
      .select({
        customer: customers,
        totalSpent: sql<string>`coalesce(sum(${bills.total}), 0)`,
      })
      .from(bills)
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .groupBy(customers.id)
      .orderBy(desc(sql`sum(${bills.total})`))
      .limit(10);

    res.json({
      totalRevenue: revenueTotals.totalRevenue,
      totalPaid: revenueTotals.totalPaid,
      topCustomers: topCustomers.map((c) => ({ ...c.customer, totalSpent: c.totalSpent })),
    });
  }),
);

export default router;
