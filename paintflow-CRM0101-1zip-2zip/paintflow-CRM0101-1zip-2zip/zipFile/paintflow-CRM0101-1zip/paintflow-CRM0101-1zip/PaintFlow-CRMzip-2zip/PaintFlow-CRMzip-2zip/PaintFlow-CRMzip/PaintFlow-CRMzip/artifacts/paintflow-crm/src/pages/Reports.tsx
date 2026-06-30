import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  IndianRupee,
  CalendarDays,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  useOutstandingBills,
  useDailyCollection,
  useMonthlyCollection,
  PAYMENT_METHOD_LABELS,
} from "@/hooks/usePayments";
import type { PaymentMethod } from "@/hooks/usePayments";

// ─── Helpers ──────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style:                 "currency",
  currency:              "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
function fmtINR(n: number) { return INR.format(n); }

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  unpaid:         "bg-amber-100 text-amber-700",
  partially_paid: "bg-teal-100 text-teal-700",
  overdue:        "bg-red-100 text-red-700",
  sent:           "bg-blue-100 text-blue-700",
  paid:           "bg-green-100 text-green-700",
};
const STATUS_LABEL: Record<string, string> = {
  unpaid:         "Unpaid",
  partially_paid: "Part. Paid",
  overdue:        "Overdue",
  sent:           "Sent",
  paid:           "Paid",
};

// ─── ReportCard wrapper ───────────────────────────────────────

function ReportCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title:        string;
  description?: string;
  icon:         React.ElementType;
  children:     React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Outstanding Bills Section ────────────────────────────────

function OutstandingSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOutstandingBills({ page });
  const rows  = data?.data ?? [];
  const total = data?.count ?? 0;
  const pages = Math.ceil(total / 20);

  return (
    <ReportCard
      title="Outstanding Dues"
      description="Bills with remaining unpaid balance, sorted by due date"
      icon={IndianRupee}
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500/40 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">All dues cleared!</p>
          <p className="text-xs text-muted-foreground mt-1">No outstanding bills at this time.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 text-left font-medium">Bill</th>
                  <th className="pb-2 pr-4 text-left font-medium">Customer</th>
                  <th className="pb-2 pr-4 text-left font-medium">Status</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total</th>
                  <th className="pb-2 pr-4 text-right font-medium">Paid</th>
                  <th className="pb-2 text-right font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/bills/${bill.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {bill.bill_number}
                      </Link>
                      {bill.due_date && (
                        <p className={`text-xs mt-0.5 ${new Date(bill.due_date) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          Due {fmtDate(bill.due_date)}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {bill.customer ? (
                        <Link
                          to={`/customers/${bill.customer.id}`}
                          className="hover:underline text-foreground"
                        >
                          {bill.customer.name}
                        </Link>
                      ) : "—"}
                      {bill.customer?.phone && (
                        <p className="text-xs text-muted-foreground">{bill.customer.phone}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${STATUS_COLOR[bill.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {STATUS_LABEL[bill.status] ?? bill.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmtINR(bill.total)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{fmtINR(bill.paid_amount)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-red-600">{fmtINR(bill.remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td colSpan={5} className="py-2 pl-2 text-xs font-medium text-muted-foreground">
                    {total} bill{total !== 1 ? "s" : ""} outstanding
                  </td>
                  <td className="py-2 pr-0 text-right text-sm font-bold text-red-600 tabular-nums">
                    {fmtINR(rows.reduce((s, b) => s + b.remaining, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </ReportCard>
  );
}

// ─── Daily Collection Section ─────────────────────────────────

function DailyCollectionSection() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const { data: rows = [], isLoading } = useDailyCollection(date);
  const dayTotal = rows.reduce((s, p) => s + p.amount, 0);

  return (
    <ReportCard
      title="Daily Collection"
      description="All payments received on a selected date"
      icon={CalendarDays}
    >
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="daily-date" className="text-xs">Select Date</Label>
          <Input
            id="daily-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {!isLoading && rows.length > 0 && (
          <div className="mb-0.5">
            <p className="text-xs text-muted-foreground">Total collected</p>
            <p className="text-xl font-bold text-emerald-600">{fmtINR(dayTotal)}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No payments on {fmtDate(date)}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 pr-4 text-left font-medium">Customer</th>
                <th className="pb-2 pr-4 text-left font-medium">Bill</th>
                <th className="pb-2 pr-4 text-left font-medium">Method</th>
                <th className="pb-2 pr-4 text-left font-medium">Reference</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{p.customer?.name ?? "—"}</p>
                    {p.customer?.phone && (
                      <p className="text-xs text-muted-foreground">{p.customer.phone}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {p.bill?.bill_number ? (
                      <Link
                        to={`/bills/${p.bill_id}`}
                        className="text-primary hover:underline text-xs"
                      >
                        {p.bill.bill_number}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="outline" className="text-xs">
                      {PAYMENT_METHOD_LABELS[p.payment_method as PaymentMethod] ?? p.payment_method}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {p.reference ?? "—"}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                    {fmtINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td colSpan={4} className="py-2 pl-2 text-xs font-medium text-muted-foreground">
                  {rows.length} payment{rows.length !== 1 ? "s" : ""}
                </td>
                <td className="py-2 pr-0 text-right text-sm font-bold text-emerald-700 tabular-nums">
                  {fmtINR(dayTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportCard>
  );
}

// ─── Monthly Collection Section ───────────────────────────────

function MonthlyCollectionSection() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: months = [], isLoading } = useMonthlyCollection(year);
  const yearTotal = months.reduce((s, m) => s + m.total, 0);
  const maxMonthTotal = Math.max(...months.map((m) => m.total), 1);

  return (
    <ReportCard
      title="Monthly Collection"
      description="Payment totals grouped by month"
      icon={Calendar}
    >
      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="monthly-year" className="text-xs">Year</Label>
          <Input
            id="monthly-year"
            type="number"
            min="2020"
            max={new Date().getFullYear() + 1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28"
          />
        </div>
        {!isLoading && yearTotal > 0 && (
          <div className="mb-0.5">
            <p className="text-xs text-muted-foreground">Year total</p>
            <p className="text-xl font-bold text-primary">{fmtINR(yearTotal)}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : yearTotal === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No payments recorded in {year}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {months.map((m) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                {m.monthName.slice(0, 3)}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(m.total / maxMonthTotal) * 100}%` }}
                />
              </div>
              <div className="text-right shrink-0 w-28">
                <span className="text-sm font-semibold tabular-nums">{m.total > 0 ? fmtINR(m.total) : "—"}</span>
                {m.count > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">{m.count} txn</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}

// ─── Revenue Reports ──────────────────────────────────────────

function RevenueReports() {
  const { data: revenueSummary, isLoading: loadingRevenue } = useQuery({
    queryKey: ["reports", "revenue-by-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("date, total, status")
        .eq("status", "paid")
        .order("date", { ascending: false });
      return (data ?? []) as { date: string; total: number; status: string }[];
    },
  });

  const { data: topCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["reports", "top-customers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("customer_id, total, customer:customers(name)")
        .eq("status", "paid");
      if (!data) return [];
      type BillRow = { customer_id: string; total: number; customer: { name: string } | null };
      const map = new Map<string, { name: string; total: number }>();
      for (const bill of data as BillRow[]) {
        const name = bill.customer?.name ?? "Unknown";
        const existing = map.get(bill.customer_id) ?? { name, total: 0 };
        map.set(bill.customer_id, { name, total: existing.total + bill.total });
      }
      return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    },
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["reports", "top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bill_items")
        .select("product_id, quantity, total, product:products(name)");
      if (!data) return [];
      type ItemRow = { product_id: string; quantity: number; total: number; product: { name: string } | null };
      const map = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const item of data as ItemRow[]) {
        const name = item.product?.name ?? "Unknown";
        const existing = map.get(item.product_id) ?? { name, quantity: 0, revenue: 0 };
        map.set(item.product_id, { name, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.total });
      }
      return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    },
  });

  const totalRevenue = (revenueSummary ?? []).reduce((s, b) => s + b.total, 0);

  return (
    <>
      {/* Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Revenue (Paid Bills)</p>
              {loadingRevenue ? (
                <div className="h-6 w-24 animate-pulse rounded bg-muted mt-1" />
              ) : (
                <p className="text-xl font-bold">{fmtINR(totalRevenue)}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Top Customers</p>
              {loadingCustomers ? (
                <div className="h-6 w-16 animate-pulse rounded bg-muted mt-1" />
              ) : (
                <p className="text-xl font-bold">{topCustomers?.length ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Top Products</p>
              {loadingProducts ? (
                <div className="h-6 w-16 animate-pulse rounded bg-muted mt-1" />
              ) : (
                <p className="text-xl font-bold">{topProducts?.length ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Customers */}
        <ReportCard
          title="Top Customers by Revenue"
          description="Customers with the highest lifetime value"
          icon={Users}
        >
          {loadingCustomers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !topCustomers || topCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No paid bills yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, idx) => (
                <div key={customer.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{customer.name}</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{fmtINR(customer.total)}</p>
                </div>
              ))}
            </div>
          )}
        </ReportCard>

        {/* Top Products */}
        <ReportCard
          title="Top Products by Revenue"
          description="Best-performing products in your catalog"
          icon={Package}
        >
          {loadingProducts ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{fmtINR(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>
    </>
  );
}

// ─── Reports Page ─────────────────────────────────────────────

type ReportTab = "revenue" | "outstanding" | "daily" | "monthly";

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "revenue",     label: "Revenue",      icon: TrendingUp },
  { id: "outstanding", label: "Outstanding",  icon: AlertCircle },
  { id: "daily",       label: "Daily",        icon: CalendarDays },
  { id: "monthly",     label: "Monthly",      icon: Calendar },
];

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>("revenue");

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" subtitle="Business performance and analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "revenue"     && <RevenueReports />}
        {tab === "outstanding" && <OutstandingSection />}
        {tab === "daily"       && <DailyCollectionSection />}
        {tab === "monthly"     && <MonthlyCollectionSection />}
      </div>
    </div>
  );
}
