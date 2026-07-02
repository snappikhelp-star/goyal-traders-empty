import { useQuery } from "@tanstack/react-query";
import {
  Users, FileText, Package, TrendingUp, AlertTriangle,
  Clock, ArrowUpRight, IndianRupee, Banknote, AlertCircle,
  Wallet, CheckCircle2, XCircle, ShoppingCart, MessageCircle,
  MapPin, Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import QuickActions from "@/components/dashboard/QuickActions";
import FollowUpReminders from "@/components/dashboard/FollowUpReminders";
import BusinessInsights from "@/components/dashboard/BusinessInsights";
import OwnerBusinessCenter from "@/components/dashboard/OwnerBusinessCenter";
import PWAInstallCard from "@/components/dashboard/PWAInstallCard";
import { supabase } from "@/lib/supabase";
import { useShopProfile } from "@/lib/shopProfile";
import { buildLowStockMessage, openWhatsApp } from "@/lib/whatsapp";
import { usePaymentStats, useMonthlyCollection } from "@/hooks/usePayments";
import { usePurchaseStats, useRecentPurchases, useSupplierPaymentStats, useRecentSupplierPayments } from "@/hooks/usePurchases";
import type { Bill } from "@/types";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const fmtINR = (n: number) => INR.format(n);
const fmtK = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

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
  paid: "Paid", sent: "Sent", draft: "Draft",
  overdue: "Overdue", cancelled: "Cancelled",
  unpaid: "Unpaid", partially_paid: "Part. Paid",
};

// ─── KPI Card ────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, color, bg, gradient, loading, href, sub,
}: {
  title: string; value: string | number;
  icon: React.ElementType; color: string; bg: string; gradient?: string;
  loading?: boolean; href?: string; sub?: string;
}) {
  const inner = (
    <Card
      className={`relative overflow-hidden border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 ${gradient ?? "bg-gradient-to-br from-card to-card/70"}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {loading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            ) : (
              <p className={`text-2xl sm:text-3xl font-black tracking-tight truncate ${color}`}>{value}</p>
            )}
            {sub && <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-green-500" />{sub}</p>}
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner ring-1 ring-black/[0.04] ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

// ─── Section Header ──────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

// ─── Rank Badge ──────────────────────────────────────────────

const RANK_COLORS = [
  "bg-amber-400 text-white",
  "bg-slate-400 text-white",
  "bg-orange-400 text-white",
  "bg-muted text-muted-foreground",
  "bg-muted text-muted-foreground",
];

// ─── Custom Tooltip ──────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-foreground">{fmtINR(payload[0].value)}</p>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────

export default function Dashboard() {
  const { profile: shopProfile } = useShopProfile();

  const { data: customersCount, isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard", "customers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: productsCount, isLoading: loadingProducts } = useQuery({
    queryKey: ["dashboard", "products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: monthRevenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["dashboard", "month-revenue"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1);
      const { data } = await supabase.from("bills").select("total").eq("status", "paid")
        .gte("date", start.toISOString().split("T")[0]);
      return ((data ?? []) as { total: number }[]).reduce((s, b) => s + b.total, 0);
    },
  });

  const { data: pendingCount, isLoading: loadingPending } = useQuery({
    queryKey: ["dashboard", "pending-count"],
    queryFn: async () => {
      const { count } = await supabase.from("bills").select("*", { count: "exact", head: true })
        .in("status", ["sent", "unpaid", "partially_paid"]);
      return count ?? 0;
    },
  });

  const { data: payStats, isLoading: loadingPayStats } = usePaymentStats();

  // Monthly sales (last 6 months from bills)
  const { data: monthlySales, isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard", "monthly-sales"],
    queryFn: async () => {
      const now = new Date();
      const months: { month: number; year: number; label: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-IN", { month: "short" }) });
      }
      const start = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;
      const { data } = await supabase.from("bills").select("date, total")
        .neq("status", "cancelled").gte("date", start);
      const map = new Map<string, number>();
      for (const b of (data ?? []) as { date: string; total: number }[]) {
        const d = new Date(b.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        map.set(key, (map.get(key) ?? 0) + b.total);
      }
      return months.map(({ year, month, label }) => ({
        label, value: map.get(`${year}-${month}`) ?? 0,
      }));
    },
  });

  // Monthly collections (last 6 months from payments)
  const currentYear = new Date().getFullYear();
  const { data: monthlyCollectionsFull, isLoading: loadingCollections } = useMonthlyCollection(currentYear);
  const monthlyCollections = (() => {
    const now = new Date();
    const last6Months: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d.getMonth() + 1);
    }
    return (monthlyCollectionsFull ?? [])
      .filter((m) => last6Months.includes(Number(m.month)))
      .map((m) => ({ label: m.monthName.slice(0, 3), value: m.total }));
  })();

  // Top 5 products by revenue
  const { data: topProducts, isLoading: loadingTopProducts } = useQuery({
    queryKey: ["dashboard", "top-products"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("bill_items")
        .select("product_id, quantity, total, product:products(name)");
      if (!data) return [];
      type Row = { product_id: string; quantity: number; total: number; product: { name: string } | null };
      const map = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const item of data as Row[]) {
        const name = item.product?.name ?? "Unknown";
        const ex = map.get(item.product_id) ?? { name, quantity: 0, revenue: 0 };
        map.set(item.product_id, { name, quantity: ex.quantity + item.quantity, revenue: ex.revenue + item.total });
      }
      return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    },
  });

  // Top 5 customers by spend
  const { data: topCustomers, isLoading: loadingTopCustomers } = useQuery({
    queryKey: ["dashboard", "top-customers"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("bills")
        .select("customer_id, total, customer:customers(name)")
        .neq("status", "cancelled");
      if (!data) return [];
      type Row = { customer_id: string; total: number; customer: { name: string } | null };
      const map = new Map<string, { name: string; total: number }>();
      for (const b of data as Row[]) {
        const name = b.customer?.name ?? "Unknown";
        const ex = map.get(b.customer_id) ?? { name, total: 0 };
        map.set(b.customer_id, { name, total: ex.total + b.total });
      }
      return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    },
  });

  // Inventory status
  const { data: inventoryStatus, isLoading: loadingInventory } = useQuery({
    queryKey: ["dashboard", "inventory-status"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("inventory")
        .select("quantity, min_quantity, reorder_level");
      const rows = (data ?? []) as { quantity: number; min_quantity: number | null; reorder_level: number | null }[];
      let inStock = 0, lowStock = 0, outOfStock = 0;
      for (const r of rows) {
        const min = r.reorder_level ?? r.min_quantity ?? 5;
        if (r.quantity === 0) outOfStock++;
        else if (r.quantity <= min) lowStock++;
        else inStock++;
      }
      return { inStock, lowStock, outOfStock, total: rows.length };
    },
  });

  // Recent bills
  const { data: recentBills, isLoading: loadingBills } = useQuery({
    queryKey: ["dashboard", "recent-bills"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("bills")
        .select("id, bill_number, status, total, paid_amount, date, customer:customers(name)")
        .order("created_at", { ascending: false }).limit(6);
      return (data ?? []) as (Bill & { customer?: { name: string } | null })[];
    },
  });

  // Recent payments
  const { data: recentPayments, isLoading: loadingRecentPayments } = useQuery({
    queryKey: ["dashboard", "recent-payments"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("payments")
        .select("id, amount, payment_method, payment_date, reference, customer:customers(name)")
        .order("payment_date", { ascending: false }).limit(6);
      return (data ?? []) as {
        id: string; amount: number; payment_method: string;
        payment_date: string; reference: string | null;
        customer?: { name: string } | null;
      }[];
    },
  });

  // Purchase stats
  const { data: purchaseStats, isLoading: loadingPurchaseStats } = usePurchaseStats();
  const { data: recentPurchasesList, isLoading: loadingRecentPurchases } = useRecentPurchases(5);
  const { data: paymentStats, isLoading: loadingPaymentStats } = useSupplierPaymentStats();
  const { data: recentSupplierPayments, isLoading: loadingRecentSupplierPayments } = useRecentSupplierPayments(5);

  // Low stock
  const { data: lowStock, isLoading: loadingLowStock } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("inventory")
        .select("id, quantity, reorder_level, min_quantity, product:products(name, unit)");
      return ((data ?? []) as {
        id: string; quantity: number; reorder_level: number | null;
        min_quantity: number | null; product?: { name: string; unit: string } | null;
      }[]).filter((i) => i.quantity <= (i.reorder_level ?? i.min_quantity ?? 5) && i.quantity > 0).slice(0, 5);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Your Dashboard"
        subtitle={`A snapshot of ${shopProfile.shop_name} • ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      <div
        className="flex-1 overflow-y-auto p-6 space-y-7 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.06),transparent_55%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.06),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.05),transparent_60%)]"
      >

        {/* ── Personalised greeting & Owner identity ───────── */}
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 p-5 sm:p-6 shadow-xl"
          data-testid="dashboard-owner-greeting"
        >
          {/* Animated rainbow paint strip */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899,#ef4444)] bg-[length:200%_100%] animate-[gradient-pan_4s_linear_infinite]"
          />

          {/* Floating paint orbs */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-6 right-[22%] h-28 w-28 rounded-full bg-orange-400/20 blur-2xl animate-[orb-float_6s_ease-in-out_infinite]" />
            <div className="absolute -bottom-4 right-[8%] h-20 w-20 rounded-full bg-yellow-300/20 blur-xl animate-[orb-float_5s_ease-in-out_1.5s_infinite]" />
            <div className="absolute top-1/2 right-[40%] h-14 w-14 rounded-full bg-pink-400/15 blur-lg animate-[orb-float_7s_ease-in-out_2.5s_infinite]" />
          </div>

          {/* Paint brand chips */}
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mr-1">Brands stocked:</span>
            {([
              { label: "JSW Paints",   cls: "bg-blue-500/25 border-blue-400/40 text-blue-100" },
              { label: "Birla Opus",   cls: "bg-orange-500/25 border-orange-400/40 text-orange-100" },
              { label: "Asian Paints", cls: "bg-red-500/25 border-red-400/40 text-red-100" },
              { label: "Berger",       cls: "bg-green-500/25 border-green-400/40 text-green-100" },
              { label: "Nerolac",      cls: "bg-purple-500/25 border-purple-400/40 text-purple-100" },
            ] as const).map((b) => (
              <span key={b.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-2xl inline-block origin-bottom" style={{ animation: "brush-wave 2.5s ease-in-out infinite" }}>🖌️</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Welcome back,{" "}
                  <span className="text-yellow-300 drop-shadow-sm">{shopProfile.owner_name}</span>
                  {" "}<span aria-hidden>👋</span>
                </h2>
              </div>
              <p className="text-sm sm:text-base text-blue-100">
                Let’s grow{" "}
                <span className="font-semibold text-white">{shopProfile.shop_name}</span>{" "}
                today.
              </p>
              <p className="text-xs sm:text-sm text-blue-200/75 italic">
                Every invoice you create is a step toward a stronger business.
              </p>
              {/* Animated paint color swatches */}
              <div className="flex gap-1.5 pt-1" aria-hidden>
                {(["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#f5f5f5"] as const).map((c, i) => (
                  <div
                    key={c}
                    className="h-4 w-4 rounded-full shadow-md ring-1 ring-white/30"
                    style={{ backgroundColor: c, animation: `swatch-pop 0.4s ease ${i * 0.07}s both` }}
                  />
                ))}
                <span className="text-[10px] text-blue-200/60 ml-1 self-center">8 shades</span>
              </div>
            </div>

            {/* Owner Identity Card — glassmorphism */}
            <div className="relative rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 w-full sm:w-auto sm:min-w-[260px] shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                Business Owner
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                  <span className="font-semibold text-white truncate">{shopProfile.owner_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-orange-300 shrink-0" />
                  <span className="text-blue-100 truncate">{shopProfile.shop_name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-yellow-300 shrink-0 mt-0.5" />
                  <span className="text-blue-200/80 leading-snug">
                    {shopProfile.address.split(",").slice(0, 2).join(", ")}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="inline-block rounded-full bg-yellow-400/20 text-yellow-200 text-[10px] font-semibold px-2 py-0.5 ring-1 ring-yellow-400/30">
                    🏪 Owner & Proprietor
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Owner Business Center ────────────────────────── */}
        <OwnerBusinessCenter />

        {/* ── PWA Install Card ─────────────────────────────── */}
        <PWAInstallCard />

        {/* ── Quick Actions ────────────────────────────────── */}
        <QuickActions />

        {/* ── Follow-up Reminders ──────────────────────────── */}
        <FollowUpReminders />

        {/* ── Row 1: KPI Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Total Customers" value={customersCount ?? 0}
            icon={Users} bg="bg-blue-100" color="text-blue-700"
            gradient="bg-gradient-to-br from-blue-50 via-white to-blue-100/60"
            loading={loadingCustomers} href="/customers" />
          <KpiCard title="Revenue This Month" value={monthRevenue != null ? fmtINR(monthRevenue) : "—"}
            icon={TrendingUp} bg="bg-green-100" color="text-green-700"
            gradient="bg-gradient-to-br from-green-50 via-white to-emerald-100/60"
            loading={loadingRevenue} />
          <KpiCard title="Pending Bills" value={pendingCount ?? 0}
            icon={Clock} bg="bg-amber-100" color="text-amber-700"
            gradient="bg-gradient-to-br from-amber-50 via-white to-yellow-100/60"
            loading={loadingPending} href="/bills" />
          <KpiCard title="Total Products" value={productsCount ?? 0}
            icon={Package} bg="bg-purple-100" color="text-purple-700"
            gradient="bg-gradient-to-br from-purple-50 via-white to-violet-100/60"
            loading={loadingProducts} href="/products" />
        </div>

        {/* ── Row 2: Sales Overview ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard title="Pending Payments" value={payStats ? fmtINR(payStats.totalOutstanding) : "—"}
            icon={IndianRupee} bg="bg-red-100" color="text-red-700"
            gradient="bg-gradient-to-br from-red-50 via-white to-rose-100/60"
            loading={loadingPayStats} href="/reports" />
          <KpiCard title="Today's Sales" value={payStats ? fmtINR(payStats.collectedToday) : "—"}
            icon={Banknote} bg="bg-emerald-100" color="text-emerald-700"
            gradient="bg-gradient-to-br from-emerald-50 via-white to-teal-100/60"
            loading={loadingPayStats} />
          <KpiCard title="Overdue Bills" value={payStats ? payStats.overdueBills : "—"}
            icon={AlertCircle} bg="bg-orange-100" color="text-orange-700"
            gradient="bg-gradient-to-br from-orange-50 via-white to-amber-100/60"
            sub={payStats && payStats.overdueAmount > 0 ? `${fmtINR(payStats.overdueAmount)} overdue` : undefined}
            loading={loadingPayStats} href="/reports" />
        </div>

        {/* ── Row 2b: Purchase KPIs ────────────────────────── */}
        <div>
          <SectionTitle>📦 Purchases &amp; Supplier Payments</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Purchase Value"
              value={purchaseStats ? fmtK(purchaseStats.totalPurchase) : "—"}
              icon={Wallet} bg="bg-indigo-100" color="text-indigo-700"
              gradient="bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60"
              loading={loadingPurchaseStats} href="/purchases"
            />
            <KpiCard
              title="This Month Purchases"
              value={purchaseStats ? fmtK(purchaseStats.monthPurchase) : "—"}
              icon={ShoppingCart} bg="bg-cyan-100" color="text-cyan-700"
              gradient="bg-gradient-to-br from-cyan-50 via-white to-cyan-100/60"
              loading={loadingPurchaseStats} href="/purchases"
            />
            <KpiCard
              title="Total Company Due"
              value={purchaseStats ? fmtK(purchaseStats.totalDue) : "—"}
              icon={AlertTriangle} bg="bg-rose-100" color="text-rose-700"
              gradient="bg-gradient-to-br from-rose-50 via-white to-rose-100/60"
              loading={loadingPurchaseStats} href="/purchases"
            />
            <KpiCard
              title="Payments This Month"
              value={paymentStats ? fmtK(paymentStats.paymentsThisMonth) : "—"}
              icon={CheckCircle2} bg="bg-green-100" color="text-green-700"
              gradient="bg-gradient-to-br from-green-50 via-white to-green-100/60"
              loading={loadingPaymentStats} href="/purchases"
            />
          </div>
        </div>

        {/* ── Recent Purchases ──────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Purchases
            </CardTitle>
            <Link to="/purchases" className="text-xs text-primary hover:underline font-medium">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecentPurchases ? (
              <div className="divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !recentPurchasesList?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No purchases yet</p>
                <Link to="/purchases/new" className="mt-2 text-xs text-primary hover:underline">
                  Record first purchase →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPurchasesList.map((p) => {
                  const statusCls: Record<string, string> = {
                    paid:    "bg-green-100 text-green-700",
                    partial: "bg-amber-100 text-amber-700",
                    due:     "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-medium truncate">{p.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.company?.name ?? "—"} · {p.invoice_date ? new Date(p.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-sm font-semibold tabular-nums">{fmtK(p.grand_total)}</span>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusCls[p.status] ?? "bg-muted text-muted-foreground"}`}>
                          {p.status === "paid" ? "Paid" : p.status === "partial" ? "Partial" : "Due"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent Supplier Payments ─────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Supplier Payments
            </CardTitle>
            <Link to="/purchases" className="text-xs text-primary hover:underline font-medium">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecentSupplierPayments ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !recentSupplierPayments?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <IndianRupee className="h-7 w-7 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No supplier payments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSupplierPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.company?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.purchase?.invoice_number ?? "—"} ·{" "}
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : ""}
                        {" "}· {p.payment_method === "bank_transfer" ? "Bank Transfer" : p.payment_method.charAt(0).toUpperCase() + p.payment_method.slice(1)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-700 tabular-nums shrink-0 ml-4">
                      {fmtK(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Row 3: Charts ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Sales */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-violet-600">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Monthly Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-100" />
              </div>
              <p className="text-xs text-blue-100">Billed amount over last 6 months</p>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingSales ? (
                <div className="h-40 animate-pulse rounded bg-muted" />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={monthlySales ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                      fill="url(#salesGrad)" dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Collections */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-purple-600 to-pink-500">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Monthly Collections</CardTitle>
                <Wallet className="h-4 w-4 text-purple-100" />
              </div>
              <p className="text-xs text-purple-100">Payments received per month</p>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingCollections ? (
                <div className="h-40 animate-pulse rounded bg-muted" />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={monthlyCollections} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Top Products + Top Customers ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 Products */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-rose-500 to-orange-500">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Top 5 Selling Products</CardTitle>
                <Package className="h-4 w-4 text-rose-100" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingTopProducts ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
              ) : !topProducts || topProducts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No sales data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[i]}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.quantity} units sold</p>
                      </div>
                      <p className="text-sm font-bold shrink-0 text-green-700">{fmtINR(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 5 Customers */}
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Top 5 Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingTopCustomers ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
              ) : !topCustomers || topCustomers.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No customer data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map((c, i) => {
                    const maxTotal = topCustomers[0].total;
                    return (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[i]}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${(c.total / maxTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-bold shrink-0">{fmtINR(c.total)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 5: Inventory Status + Recent Payments ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inventory Status */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500 to-teal-500">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Inventory Status</CardTitle>
                <Link to="/inventory" className="text-xs text-emerald-100 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {loadingInventory ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-green-50 p-3 text-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-green-700">{inventoryStatus?.inStock ?? 0}</p>
                      <p className="text-xs font-medium text-green-600">In Stock</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                      <p className="text-xl font-bold text-amber-600">{inventoryStatus?.lowStock ?? 0}</p>
                      <p className="text-xs font-medium text-amber-500">Low Stock</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-3 text-center">
                      <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                      <p className="text-xl font-bold text-red-600">{inventoryStatus?.outOfStock ?? 0}</p>
                      <p className="text-xs font-medium text-red-500">Out of Stock</p>
                    </div>
                  </div>

                  {/* Low stock items */}
                  {(lowStock ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items needing restock</p>
                      {(loadingLowStock ? [] : lowStock ?? []).map((item) => (
                        <Link key={item.id} to="/inventory"
                          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                          <p className="text-sm font-medium truncate">{item.product?.name ?? "Unknown"}</p>
                          <Badge variant="destructive" className="text-xs shrink-0">
                            {item.quantity} {item.product?.unit ?? ""} left
                          </Badge>
                        </Link>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 gap-2 border-green-200 text-green-700 hover:bg-green-50"
                        data-testid="dashboard-lowstock-whatsapp-btn"
                        onClick={() => {
                          const items = (lowStock ?? []).map((it) => ({
                            name: it.product?.name ?? "Unknown",
                            quantity: it.quantity,
                            unit: it.product?.unit,
                          }));
                          const message = buildLowStockMessage({
                            shop: { shop_name: shopProfile.shop_name },
                            items,
                          });
                          // Send to the shop owner's own WhatsApp number.
                          openWhatsApp(shopProfile.phone, message);
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Send Low-Stock Alert on WhatsApp
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-yellow-400">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Recent Payments</CardTitle>
                <Banknote className="h-4 w-4 text-amber-100" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingRecentPayments ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
              ) : !recentPayments || recentPayments.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Banknote className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No payments yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {p.payment_method.replace("_", " ")} · {new Date(p.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-700 shrink-0 ml-3">{fmtINR(p.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 6: Recent Bills ──────────────────────────── */}
        <Card className="border-0 shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-600 to-blue-500">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">Recent Bills</CardTitle>
              <Link to="/bills" className="flex items-center gap-1 text-xs text-indigo-100 hover:underline">
                <FileText className="h-3.5 w-3.5" /> View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingBills ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
            ) : !recentBills || recentBills.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No bills yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentBills.map((bill) => (
                  <Link key={bill.id} to={`/bills/${bill.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold font-mono group-hover:text-primary transition-colors">
                        {bill.bill_number}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(bill as Bill & { customer?: { name: string } | null }).customer?.name ?? ""} · {bill.date}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <span className="text-sm font-bold">{fmtINR(bill.total)}</span>
                      <Badge className={`text-xs px-2 py-0 ${STATUS_COLOR[bill.status] ?? "bg-muted text-muted-foreground"}`} variant="secondary">
                        {STATUS_LABEL[bill.status] ?? bill.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Business Insights ────────────────────────────── */}
        <BusinessInsights />

        {/* ── Dashboard footer message ─────────────────────── */}
        <p
          className="text-center text-xs text-muted-foreground pt-2 pb-1"
          data-testid="dashboard-footer-message"
        >
          Built for long-term business success <span aria-hidden>📈</span>
        </p>

      </div>
    </div>
  );
}
