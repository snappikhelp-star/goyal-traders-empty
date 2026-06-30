import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useShopProfile } from "@/lib/shopProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Clock, Store, FileText, Users, Package, ShoppingCart,
  IndianRupee, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Zap, BarChart2, Bell, UserPlus, Wallet,
  ArrowUpRight, ArrowDownRight, CreditCard, Activity,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const fmtINR = (n: number) => INR.format(n);
const fmtK = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000  ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

function isShopOpen(): boolean {
  const h = new Date().getHours();
  return h >= 9 && h < 20;
}

function classifyBrand(brand: string | null): "JSW Paints" | "Birla Opus" | "Other" {
  if (!brand) return "Other";
  const b = brand.toLowerCase();
  if (b.includes("jsw")) return "JSW Paints";
  if (b.includes("birla") || b.includes("opus")) return "Birla Opus";
  return "Other";
}

const BRAND_COLORS: Record<string, string> = {
  "JSW Paints": "#3b82f6",
  "Birla Opus":  "#f97316",
  "Other":       "#8b5cf6",
};

// ─── 1. Welcome Card ─────────────────────────────────────────

function WelcomeCard() {
  const { profile } = useShopProfile();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const open = isShopOpen();

  return (
    <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Owner Business Center</p>
            <h2 className="text-xl font-bold text-white">
              Welcome back, <span className="text-yellow-300">{profile.owner_name}</span> 👋
            </h2>
            <p className="text-sm text-blue-100">
              Owner of <span className="font-semibold text-white">{profile.shop_name}</span>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {/* Date & Time */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Clock className="h-4 w-4 text-blue-200 shrink-0" />
              <div>
                <p className="text-white font-mono font-bold text-base leading-none">
                  {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
                <p className="text-blue-200 text-xs mt-0.5">
                  {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            {/* Shop Status */}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${open ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40" : "bg-red-400/20 text-red-200 ring-1 ring-red-400/40"}`}>
              <Store className="h-3.5 w-3.5" />
              Shop is {open ? "Open" : "Closed"}
              <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-400" : "bg-red-400"}`} style={{ boxShadow: open ? "0 0 6px #4ade80" : "0 0 6px #f87171" }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2. Today's Business Summary ─────────────────────────────

function TodaysSummary() {
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["obc", "today-summary", today],
    queryFn: async () => {
      const [billsRes, purchasesRes, paymentsRes, supPayRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("total").eq("date", today).neq("status", "cancelled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases").select("grand_total").eq("invoice_date", today),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("payments").select("amount").eq("payment_date", today),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchase_payments").select("amount").eq("payment_date", today),
      ]);

      const sales     = ((billsRes.data ?? []) as { total: number }[]).reduce((s, r) => s + r.total, 0);
      const purchases = ((purchasesRes.data ?? []) as { grand_total: number }[]).reduce((s, r) => s + r.grand_total, 0);
      const collection = ((paymentsRes.data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
      const supplierPmt = ((supPayRes.data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
      const profit = sales - purchases;

      return { sales, purchases, collection, supplierPmt, profit };
    },
  });

  const items = [
    { label: "Sales",              value: data?.sales      ?? 0, icon: TrendingUp,    color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100" },
    { label: "Purchases",          value: data?.purchases  ?? 0, icon: ShoppingCart,  color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-100" },
    { label: "Collection",         value: data?.collection ?? 0, icon: Wallet,        color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Supplier Payment",   value: data?.supplierPmt ?? 0, icon: CreditCard,   color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-100" },
    { label: "Profit Estimate",    value: data?.profit     ?? 0, icon: IndianRupee,   color: (data?.profit ?? 0) >= 0 ? "text-green-700" : "text-red-700", bg: (data?.profit ?? 0) >= 0 ? "bg-green-50" : "bg-red-50", border: (data?.profit ?? 0) >= 0 ? "border-green-100" : "border-red-100" },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-700 to-slate-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4" /> Today's Business Summary
        </CardTitle>
        <p className="text-xs text-slate-300">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-3 flex flex-col gap-1`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              ) : (
                <p className={`text-base font-black tabular-nums ${color}`}>{fmtK(Math.abs(value))}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 3. Pending Actions ───────────────────────────────────────

function PendingActions() {
  const { data, isLoading } = useQuery({
    queryKey: ["obc", "pending-actions"],
    queryFn: async () => {
      const [custBillsRes, compDueRes, lowStockRes, purPayRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("total, paid_amount").in("status", ["unpaid", "partially_paid", "overdue", "sent"]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("companies").select("outstanding_due").gt("outstanding_due", 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("inventory").select("quantity, reorder_level, min_quantity").gt("quantity", 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases").select("due_amount").in("status", ["due", "partial"]),
      ]);

      type BillRow = { total: number; paid_amount: number };
      type CompRow = { outstanding_due: number };
      type InvRow  = { quantity: number; reorder_level: number | null; min_quantity: number | null };
      type PurRow  = { due_amount: number };

      const custBills = (custBillsRes.data ?? []) as BillRow[];
      const custCount = custBills.length;
      const custAmt   = custBills.reduce((s, r) => s + (r.total - (r.paid_amount ?? 0)), 0);

      const comps    = (compDueRes.data ?? []) as CompRow[];
      const compCount = comps.length;
      const compAmt   = comps.reduce((s, r) => s + r.outstanding_due, 0);

      const invRows = (lowStockRes.data ?? []) as InvRow[];
      const lowStockCount = invRows.filter((r) => r.quantity <= (r.reorder_level ?? r.min_quantity ?? 5)).length;

      const purRows  = (purPayRes.data ?? []) as PurRow[];
      const purCount = purRows.length;
      const purAmt   = purRows.reduce((s, r) => s + r.due_amount, 0);

      return { custCount, custAmt, compCount, compAmt, lowStockCount, purCount, purAmt };
    },
  });

  const cards = [
    { label: "Customer Payments Due",    count: data?.custCount     ?? 0, amt: data?.custAmt   ?? 0, icon: Users,         color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  href: "/bills" },
    { label: "Company Payments Due",     count: data?.compCount     ?? 0, amt: data?.compAmt   ?? 0, icon: Wallet,        color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    href: "/purchases" },
    { label: "Low Stock Products",       count: data?.lowStockCount ?? 0, amt: null,                 icon: Package,       color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", href: "/inventory" },
    { label: "Pending Purchase Payments",count: data?.purCount      ?? 0, amt: data?.purAmt    ?? 0, icon: ShoppingCart,  color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", href: "/purchases" },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-600 to-orange-500">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Pending Actions
        </CardTitle>
        <p className="text-xs text-amber-100">Items requiring your attention</p>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, count, amt, icon: Icon, color, bg, border, href }) => (
            <Link key={label} to={href}>
              <div className={`rounded-xl border ${border} ${bg} p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {isLoading ? (
                    <div className="h-6 w-8 animate-pulse rounded bg-muted" />
                  ) : (
                    <span className={`text-xl font-black ${color}`}>{count}</span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
                {amt !== null && !isLoading && amt > 0 && (
                  <p className={`text-xs font-bold ${color}`}>{fmtK(amt)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 4. Quick Actions ─────────────────────────────────────────

function QuickActionsCenter() {
  const actions = [
    { label: "Create Bill",             icon: FileText,    href: "/bills/new",        bg: "bg-blue-600 hover:bg-blue-700",    shadow: "shadow-blue-200" },
    { label: "Add Customer",            icon: UserPlus,    href: "/customers/new",    bg: "bg-emerald-600 hover:bg-emerald-700", shadow: "shadow-emerald-200" },
    { label: "Add Product",             icon: Package,     href: "/products",         bg: "bg-purple-600 hover:bg-purple-700",   shadow: "shadow-purple-200" },
    { label: "Record Purchase",         icon: ShoppingCart,href: "/purchases/new",    bg: "bg-orange-500 hover:bg-orange-600",   shadow: "shadow-orange-200" },
    { label: "Supplier Payment",        icon: CreditCard,  href: "/purchases",        bg: "bg-rose-600 hover:bg-rose-700",       shadow: "shadow-rose-200" },
    { label: "View Reports",            icon: BarChart2,   href: "/reports",          bg: "bg-slate-700 hover:bg-slate-800",     shadow: "shadow-slate-200" },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-indigo-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="h-4 w-4" /> Quick Actions
        </CardTitle>
        <p className="text-xs text-blue-100">Jump to the most common tasks</p>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {actions.map(({ label, icon: Icon, href, bg, shadow }) => (
            <Link key={label} to={href}>
              <Button className={`w-full h-auto flex-col gap-2 py-3 px-2 text-white border-0 shadow-md ${shadow} ${bg} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 5. Business Health ───────────────────────────────────────

function BusinessHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ["obc", "health"],
    queryFn: async () => {
      const [payRes, compRes, invRes, custRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("customers").select("pending_balance").gt("pending_balance", 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("companies").select("outstanding_due").gt("outstanding_due", 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("inventory").select("quantity, reorder_level, min_quantity"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("payments").select("amount").gte("payment_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
      ]);

      type CustRow = { pending_balance: number };
      type CompRow = { outstanding_due: number };
      type InvRow  = { quantity: number; reorder_level: number | null; min_quantity: number | null };
      type PmtRow  = { amount: number };

      const receivable = ((payRes.data ?? []) as CustRow[]).reduce((s, r) => s + r.pending_balance, 0);
      const payable    = ((compRes.data ?? []) as CompRow[]).reduce((s, r) => s + r.outstanding_due, 0);
      const invRows    = (invRes.data ?? []) as InvRow[];
      const lowStockCount = invRows.filter((r) => r.quantity <= (r.reorder_level ?? r.min_quantity ?? 5)).length;
      const totalItems    = invRows.length;
      const cashFlow   = ((custRes.data ?? []) as PmtRow[]).reduce((s, r) => s + r.amount, 0);

      const cashFlowStatus   = cashFlow > 0 ? "healthy" : "low";
      const receivableStatus = receivable < 50000 ? "good" : receivable < 200000 ? "moderate" : "high";
      const payableStatus    = payable < 50000 ? "good" : payable < 200000 ? "moderate" : "high";
      const stockStatus      = (totalItems > 0 && lowStockCount / totalItems < 0.1) ? "good" : lowStockCount < 5 ? "moderate" : "critical";

      return { cashFlow, receivable, payable, lowStockCount, cashFlowStatus, receivableStatus, payableStatus, stockStatus };
    },
  });

  const STATUS_CONF = {
    healthy:  { dot: "🟢", badge: "bg-emerald-100 text-emerald-700", label: "Healthy" },
    good:     { dot: "🟢", badge: "bg-emerald-100 text-emerald-700", label: "Good" },
    low:      { dot: "🟡", badge: "bg-yellow-100 text-yellow-700",   label: "Low" },
    moderate: { dot: "🟡", badge: "bg-yellow-100 text-yellow-700",   label: "Moderate" },
    high:     { dot: "🟠", badge: "bg-orange-100 text-orange-700",   label: "High" },
    critical: { dot: "🔴", badge: "bg-red-100 text-red-700",         label: "Critical" },
  } as const;

  type StatusKey = keyof typeof STATUS_CONF;

  const indicators = [
    { label: "Cash Flow",                   status: (data?.cashFlowStatus   ?? "low")     as StatusKey, value: data ? fmtK(data.cashFlow)    : "—", sub: "This month's collections" },
    { label: "Outstanding Receivables",     status: (data?.receivableStatus ?? "moderate") as StatusKey, value: data ? fmtK(data.receivable)   : "—", sub: "Customer dues" },
    { label: "Outstanding Supplier Payments",status: (data?.payableStatus   ?? "moderate") as StatusKey, value: data ? fmtK(data.payable)      : "—", sub: "Company dues" },
    { label: "Low Stock Alerts",            status: (data?.stockStatus      ?? "moderate") as StatusKey, value: data ? `${data.lowStockCount} items` : "—", sub: "Below reorder level" },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-600 to-teal-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4" /> Business Health
        </CardTitle>
        <p className="text-xs text-emerald-100">Real-time health indicators</p>
      </CardHeader>
      <CardContent className="pt-3 space-y-2">
        {indicators.map(({ label, status, value, sub }) => {
          const conf = STATUS_CONF[status];
          return (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
              <span className="text-lg shrink-0">{conf.dot}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className="shrink-0 text-right">
                {isLoading ? (
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <>
                    <p className="text-sm font-bold">{value}</p>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${conf.badge}`}>{conf.label}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── 6. Business Performance ──────────────────────────────────

function BusinessPerformance() {
  const now = new Date();
  const thisMonthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd    = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["obc", "performance"],
    queryFn: async () => {
      const [billsThisRes, billsLastRes, purThisRes, purLastRes, collThisRes, billsAllRes, collAllRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("total").gte("date", thisMonthStart).neq("status", "cancelled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("total").gte("date", lastMonthStart).lte("date", lastMonthEnd).neq("status", "cancelled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases").select("grand_total").gte("invoice_date", thisMonthStart),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases").select("grand_total").gte("invoice_date", lastMonthStart).lte("invoice_date", lastMonthEnd),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("payments").select("amount").gte("payment_date", thisMonthStart),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("total").neq("status", "cancelled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("payments").select("amount"),
      ]);

      type AmtRow = { total?: number; grand_total?: number; amount?: number };

      const sum = (rows: AmtRow[], key: keyof AmtRow) =>
        ((rows ?? []) as AmtRow[]).reduce((s, r) => s + (Number(r[key]) ?? 0), 0);

      const salesThis  = sum(billsThisRes.data ?? [],  "total");
      const salesLast  = sum(billsLastRes.data ?? [],  "total");
      const purThis    = sum(purThisRes.data  ?? [],   "grand_total");
      const purLast    = sum(purLastRes.data  ?? [],   "grand_total");
      const collThis   = sum(collThisRes.data ?? [],   "amount");
      const totalSales = sum(billsAllRes.data ?? [],   "total");
      const totalColl  = sum(collAllRes.data  ?? [],   "amount");

      const salesGrowth = salesLast > 0 ? ((salesThis - salesLast) / salesLast) * 100 : 0;
      const purGrowth   = purLast   > 0 ? ((purThis   - purLast)   / purLast)   * 100 : 0;
      const collRate    = totalSales > 0 ? Math.min(100, (totalColl / totalSales) * 100) : 0;

      return { salesThis, salesLast, purThis, purLast, salesGrowth, purGrowth, collRate };
    },
  });

  const metrics = [
    { label: "Sales Growth",         value: data?.salesGrowth ?? 0, isPercent: true, suffix: "% vs last month" },
    { label: "Purchase Growth",      value: data?.purGrowth   ?? 0, isPercent: true, suffix: "% vs last month" },
    { label: "Collection Rate",      value: data?.collRate    ?? 0, isPercent: true, suffix: "% of total billed" },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-indigo-600 to-violet-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Business Performance
        </CardTitle>
        <p className="text-xs text-indigo-100">Month-over-month comparison</p>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {metrics.map(({ label, value, suffix }) => {
          const isPos = value >= 0;
          const pct   = Math.min(100, Math.abs(value));
          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                {isLoading ? (
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="flex items-center gap-1">
                    {isPos
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                    <span className={`text-xs font-bold ${isPos ? "text-emerald-700" : "text-red-600"}`}>
                      {Math.abs(value).toFixed(1)}{suffix.startsWith("%") ? "%" : ""}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{suffix.replace(/^\d+%/, "")}</span>
                  </div>
                )}
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isPos ? "bg-emerald-500" : "bg-red-400"}`}
                  style={{ width: isLoading ? "0%" : `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Mini bar chart: this month vs last */}
        {!isLoading && data && (
          <div className="pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sales: This vs Last Month</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={[
                { label: "Last Month", value: data.salesLast, fill: "#94a3b8" },
                { label: "This Month", value: data.salesThis, fill: "#3b82f6" },
              ]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {[{ fill: "#94a3b8" }, { fill: "#3b82f6" }].map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 7. Brand Performance ─────────────────────────────────────

function BrandPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ["obc", "brand-performance"],
    queryFn: async () => {
      const [billItemsRes, purItemsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bill_items").select("brand, total"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchase_items").select("line_total, product:products(brand)"),
      ]);

      type SaleRow = { brand: string | null; total: number };
      type PurRow  = { line_total: number; product: { brand: string | null } | null };

      const salesMap: Record<string, number>    = { "JSW Paints": 0, "Birla Opus": 0, "Other": 0 };
      const purchaseMap: Record<string, number> = { "JSW Paints": 0, "Birla Opus": 0, "Other": 0 };

      for (const r of (billItemsRes.data ?? []) as SaleRow[]) {
        salesMap[classifyBrand(r.brand)] += r.total ?? 0;
      }
      for (const r of (purItemsRes.data ?? []) as PurRow[]) {
        const p = Array.isArray(r.product) ? (r.product[0] ?? null) : r.product;
        purchaseMap[classifyBrand(p?.brand ?? null)] += r.line_total ?? 0;
      }

      return ["JSW Paints", "Birla Opus", "Other"].map((brand) => ({
        brand,
        sales:    salesMap[brand],
        purchases: purchaseMap[brand],
        profit:   salesMap[brand] - purchaseMap[brand],
      }));
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-rose-600 to-pink-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart2 className="h-4 w-4" /> Brand Performance
        </CardTitle>
        <p className="text-xs text-rose-100">Sales, Purchases &amp; Profit by brand</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded bg-muted" />
        ) : (
          <div className="space-y-4">
            {(data ?? []).map(({ brand, sales, purchases, profit }) => (
              <div key={brand} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BRAND_COLORS[brand] }} />
                    <p className="text-sm font-semibold">{brand}</p>
                  </div>
                  <span className={`text-xs font-bold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {profit >= 0 ? "+" : ""}{fmtK(profit)} profit
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Sales</p>
                    <p className="text-xs font-bold text-blue-700">{fmtK(sales)}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Purchases</p>
                    <p className="text-xs font-bold text-orange-700">{fmtK(purchases)}</p>
                  </div>
                </div>
                {/* Relative bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, sales > 0 ? 100 : 0)}%`,
                      background: BRAND_COLORS[brand],
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 8. Smart Alerts ─────────────────────────────────────────

function SmartAlerts() {
  const { data, isLoading } = useQuery({
    queryKey: ["obc", "smart-alerts"],
    queryFn: async () => {
      const [reorderRes, largeBillsRes, supDueRes, recentCustRes] = await Promise.all([
        // Products to reorder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("inventory")
          .select("quantity, reorder_level, min_quantity, product:products(name)")
          .gt("quantity", 0),
        // Large pending bills
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills")
          .select("bill_number, total, paid_amount, customer:customers(name)")
          .in("status", ["unpaid", "partially_paid", "overdue"])
          .order("total", { ascending: false })
          .limit(4),
        // Supplier payments due
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases")
          .select("invoice_number, due_amount, due_date, company:companies(name)")
          .in("status", ["due", "partial"])
          .order("due_date", { ascending: true })
          .limit(4),
        // Recently added customers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("customers")
          .select("name, created_at, city")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      type InvRow = { quantity: number; reorder_level: number | null; min_quantity: number | null; product: { name: string } | null };
      type BillRow = { bill_number: string; total: number; paid_amount: number; customer: { name: string } | null };
      type PurRow = { invoice_number: string; due_amount: number; due_date: string | null; company: { name: string } | null };
      type CustRow = { name: string; created_at: string; city: string | null };

      const reorderItems = ((reorderRes.data ?? []) as InvRow[])
        .filter((r) => r.quantity <= (r.reorder_level ?? r.min_quantity ?? 5))
        .slice(0, 4)
        .map((r) => {
          const p = Array.isArray(r.product) ? (r.product[0] ?? null) : r.product;
          return { name: p?.name ?? "Unknown", quantity: r.quantity };
        });

      const largeBills = ((largeBillsRes.data ?? []) as BillRow[]).map((b) => ({
        number: b.bill_number,
        customer: (Array.isArray(b.customer) ? (b.customer[0] ?? null) : b.customer)?.name ?? "Unknown",
        pending: b.total - (b.paid_amount ?? 0),
      }));

      const supDue = ((supDueRes.data ?? []) as PurRow[]).map((p) => ({
        number: p.invoice_number,
        company: (Array.isArray(p.company) ? (p.company[0] ?? null) : p.company)?.name ?? "Unknown",
        due: p.due_amount,
        dueDate: p.due_date,
      }));

      const recentCustomers = ((recentCustRes.data ?? []) as CustRow[]).map((c) => ({
        name: c.name,
        city: c.city ?? "",
        added: new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      }));

      return { reorderItems, largeBills, supDue, recentCustomers };
    },
  });

  const alertSections = [
    {
      title: "Products to Reorder",
      icon: Package,
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-100",
      items: (data?.reorderItems ?? []).map((p) => ({
        main: p.name,
        sub: `Only ${p.quantity} units left`,
        badge: "Reorder",
        badgeCls: "bg-orange-100 text-orange-700",
      })),
    },
    {
      title: "Large Pending Bills",
      icon: FileText,
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-100",
      items: (data?.largeBills ?? []).map((b) => ({
        main: b.customer,
        sub: b.number,
        badge: fmtK(b.pending),
        badgeCls: "bg-red-100 text-red-700",
      })),
    },
    {
      title: "Supplier Payments Due",
      icon: Wallet,
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-100",
      items: (data?.supDue ?? []).map((p) => ({
        main: p.company,
        sub: p.number + (p.dueDate ? ` · Due ${new Date(p.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""),
        badge: fmtK(p.due),
        badgeCls: "bg-purple-100 text-purple-700",
      })),
    },
    {
      title: "Recently Added Customers",
      icon: Users,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-100",
      items: (data?.recentCustomers ?? []).map((c) => ({
        main: c.name,
        sub: [c.city, c.added].filter(Boolean).join(" · "),
        badge: "New",
        badgeCls: "bg-blue-100 text-blue-700",
      })),
    },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-700 to-indigo-600">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell className="h-4 w-4" /> Smart Alerts
        </CardTitle>
        <p className="text-xs text-violet-200">Actionable insights for today</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-3">{[0,1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alertSections.map(({ title, icon: Icon, color, bg, border, items }) => (
              <div key={title} className={`rounded-xl border ${border} ${bg} p-3`}>
                <div className={`flex items-center gap-1.5 mb-2`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${color}`}>{title}</p>
                  <Badge className={`text-[9px] ml-auto border-0 ${color === "text-orange-700" ? "bg-orange-200 text-orange-700" : color === "text-red-700" ? "bg-red-200 text-red-700" : color === "text-purple-700" ? "bg-purple-200 text-purple-700" : "bg-blue-200 text-blue-700"}`}>
                    {items.length}
                  </Badge>
                </div>
                {items.length === 0 ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">All clear</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{item.main}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                        </div>
                        <Badge className={`text-[9px] shrink-0 border-0 ${item.badgeCls}`}>{item.badge}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Export ─────────────────────────────────────────────

export default function OwnerBusinessCenter() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-blue-600" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Owner Business Center</h3>
        <div className="h-1 flex-1 rounded-full bg-blue-100" />
      </div>

      {/* 1. Welcome */}
      <WelcomeCard />

      {/* 2 + 3: Today Summary + Pending Actions */}
      <TodaysSummary />
      <PendingActions />

      {/* 4. Quick Actions */}
      <QuickActionsCenter />

      {/* 5 + 6: Health + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BusinessHealth />
        <BusinessPerformance />
      </div>

      {/* 7 + 8: Brand Performance + Smart Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BrandPerformance />
        <SmartAlerts />
      </div>
    </div>
  );
}
