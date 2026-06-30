import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  IndianRupee,
  Banknote,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { usePaymentStats } from "@/hooks/usePayments";
import type { Bill } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style:                 "currency",
  currency:              "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
function fmtINR(n: number) { return INR.format(n); }

// ─── StatCard ─────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading,
  href,
}: {
  title:    string;
  value:    string | number;
  icon:     React.ElementType;
  trend?:   string;
  color:    string;
  loading?: boolean;
  href?:    string;
}) {
  const inner = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {trend && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                {trend}
              </p>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ─── Status config ────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  paid:           "bg-green-100 text-green-700",
  sent:           "bg-blue-100 text-blue-700",
  draft:          "bg-gray-100 text-gray-700",
  overdue:        "bg-red-100 text-red-700",
  cancelled:      "bg-orange-100 text-orange-700",
  unpaid:         "bg-amber-100 text-amber-700",
  partially_paid: "bg-teal-100 text-teal-700",
};

const STATUS_LABEL: Record<string, string> = {
  paid:           "Paid",
  sent:           "Sent",
  draft:          "Draft",
  overdue:        "Overdue",
  cancelled:      "Cancelled",
  unpaid:         "Unpaid",
  partially_paid: "Part. Paid",
};

// ─── Dashboard ────────────────────────────────────────────────

export default function Dashboard() {
  const { data: customersCount, isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard", "customers-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: productsCount, isLoading: loadingProducts } = useQuery({
    queryKey: ["dashboard", "products-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recentBills, isLoading: loadingBills } = useQuery({
    queryKey: ["dashboard", "recent-bills"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("bills")
        .select("id, bill_number, status, total, paid_amount, date, customer:customers(name)")
        .order("date", { ascending: false })
        .limit(6);
      return (data ?? []) as (Bill & { customer?: { name: string } | null })[];
    },
  });

  const { data: lowStock, isLoading: loadingStock } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("inventory")
        .select("id, quantity, reorder_level, min_quantity, product:products(name, unit)");
      return ((data ?? []) as {
        id: string;
        quantity: number;
        reorder_level: number | null;
        min_quantity:  number | null;
        product?: { name: string; unit: string } | null;
      }[]).filter(
        (item) => item.quantity <= (item.reorder_level ?? item.min_quantity ?? 5),
      ).slice(0, 5);
    },
  });

  const { data: monthRevenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["dashboard", "month-revenue"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const { data } = await supabase
        .from("bills")
        .select("total")
        .eq("status", "paid")
        .gte("date", start.toISOString().split("T")[0]);
      return ((data ?? []) as { total: number }[]).reduce((s, b) => s + (b.total ?? 0), 0);
    },
  });

  const { data: pendingCount, isLoading: loadingPending } = useQuery({
    queryKey: ["dashboard", "pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bills")
        .select("*", { count: "exact", head: true })
        .in("status", ["sent", "unpaid", "partially_paid"]);
      return count ?? 0;
    },
  });

  const { data: payStats, isLoading: loadingPayStats } = usePaymentStats();

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Overview of your paint shop operations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Row 1 — Core metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customersCount ?? 0}
            icon={Users}
            color="bg-blue-50 text-blue-600"
            loading={loadingCustomers}
            href="/customers"
          />
          <StatCard
            title="Revenue This Month"
            value={monthRevenue != null ? fmtINR(monthRevenue) : "—"}
            icon={TrendingUp}
            color="bg-green-50 text-green-600"
            loading={loadingRevenue}
          />
          <StatCard
            title="Pending Bills"
            value={pendingCount ?? 0}
            icon={Clock}
            color="bg-amber-50 text-amber-600"
            loading={loadingPending}
            href="/bills"
          />
          <StatCard
            title="Total Products"
            value={productsCount ?? 0}
            icon={Package}
            color="bg-purple-50 text-purple-600"
            loading={loadingProducts}
            href="/products"
          />
        </div>

        {/* Row 2 — Payment stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Outstanding"
            value={payStats ? fmtINR(payStats.totalOutstanding) : "—"}
            icon={IndianRupee}
            color="bg-red-50 text-red-600"
            loading={loadingPayStats}
            href="/reports"
          />
          <StatCard
            title="Collected Today"
            value={payStats ? fmtINR(payStats.collectedToday) : "—"}
            icon={Banknote}
            color="bg-emerald-50 text-emerald-600"
            loading={loadingPayStats}
          />
          <StatCard
            title="Overdue Bills"
            value={payStats ? payStats.overdueBills : "—"}
            icon={AlertCircle}
            color="bg-orange-50 text-orange-600"
            loading={loadingPayStats}
            trend={payStats && payStats.overdueAmount > 0 ? `${fmtINR(payStats.overdueAmount)} overdue` : undefined}
            href="/reports"
          />
        </div>

        {/* Row 3 — Tables */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Bills */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBills ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : !recentBills || recentBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No bills yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentBills.map((bill) => (
                    <Link
                      key={bill.id}
                      to={`/bills/${bill.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary">
                          {bill.bill_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(bill as any).customer?.name ?? ""} · {bill.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">{fmtINR(bill.total)}</span>
                        <Badge
                          className={`text-xs font-medium px-2 ${STATUS_COLOR[bill.status] ?? "bg-muted text-muted-foreground"}`}
                          variant="secondary"
                        >
                          {STATUS_LABEL[bill.status] ?? bill.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loadingStock ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : !lowStock || lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {lowStock.map((item) => (
                    <Link
                      key={item.id}
                      to="/inventory"
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {item.product?.name ?? "Unknown product"}
                      </p>
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {item.quantity} {item.product?.unit ?? ""} left
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
