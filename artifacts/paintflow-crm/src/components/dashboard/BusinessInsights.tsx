import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Snail,
  BarChart2, IndianRupee,
} from "lucide-react";

// ─── Formatters ──────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const fmtINR = (n: number) => INR.format(n);
const fmtK = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000  ? `₹${(n / 1000).toFixed(0)}K`
  : `₹${n}`;

// ─── Helpers ─────────────────────────────────────────────────

function classifyBrand(brand: string | null): "JSW Paints" | "Birla Opus" | "Other" {
  if (!brand) return "Other";
  const b = brand.trim().toLowerCase();
  if (b.includes("jsw")) return "JSW Paints";
  if (b.includes("birla") || b.includes("opus")) return "Birla Opus";
  return "Other";
}

const BRAND_COLORS: Record<string, string> = {
  "JSW Paints": "#3b82f6",
  "Birla Opus": "#f97316",
  "Other":      "#8b5cf6",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: MONTH_LABELS[d.getMonth()],
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

// ─── Custom Pie Tooltip ──────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: string } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold">{p.name}</p>
      <p className="text-muted-foreground">{fmtINR(p.value)} · {p.payload.pct}%</p>
    </div>
  );
}

// ─── Custom Bar Tooltip ──────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-bold" style={{ color: p.fill }}>{p.name}: {fmtINR(p.value)}</p>
      ))}
    </div>
  );
}

// ─── 1. Brand-wise Sales ─────────────────────────────────────

function BrandWiseSales() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "brand-sales"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("bill_items")
        .select("brand, total");
      type Row = { brand: string | null; total: number };
      const map: Record<string, number> = { "JSW Paints": 0, "Birla Opus": 0, "Other": 0 };
      for (const row of (data ?? []) as Row[]) {
        map[classifyBrand(row.brand)] += row.total ?? 0;
      }
      const total = Object.values(map).reduce((a, b) => a + b, 0);
      return Object.entries(map).map(([name, value]) => ({
        name, value,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0",
      }));
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Brand Wise Sales
          </CardTitle>
        </div>
        <p className="text-xs text-blue-100">Revenue breakdown by paint brand</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="h-44 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={65} innerRadius={35} paddingAngle={3}>
                  {(data ?? []).map((entry) => (
                    <Cell key={entry.name} fill={BRAND_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-[140px]">
              {(data ?? []).map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BRAND_COLORS[entry.name] }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtK(entry.value)} · {entry.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 2. Brand-wise Purchases ─────────────────────────────────

function BrandWisePurchases() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "brand-purchases"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("purchase_items")
        .select("line_total, product_id, product:products(brand)");
      type Row = { line_total: number; product_id: string | null; product: { brand: string | null } | null };
      const map: Record<string, number> = { "JSW Paints": 0, "Birla Opus": 0, "Other": 0 };
      for (const row of (data ?? []) as Row[]) {
        const brand = Array.isArray(row.product) ? (row.product[0] as { brand: string | null } | undefined)?.brand ?? null : row.product?.brand ?? null;
        map[classifyBrand(brand)] += row.line_total ?? 0;
      }
      const total = Object.values(map).reduce((a, b) => a + b, 0);
      return Object.entries(map).map(([name, value]) => ({
        name, value,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0",
      }));
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Brand Wise Purchases
          </CardTitle>
        </div>
        <p className="text-xs text-orange-100">Purchase amount by paint brand</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="h-44 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={65} innerRadius={35} paddingAngle={3}>
                  {(data ?? []).map((entry) => (
                    <Cell key={entry.name} fill={BRAND_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-[140px]">
              {(data ?? []).map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BRAND_COLORS[entry.name] }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtK(entry.value)} · {entry.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 3. Estimated Gross Profit ────────────────────────────────

function EstimatedGrossProfit() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "gross-profit"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split("T")[0];

      const [salesRes, purchasesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("bills").select("date, total").neq("status", "cancelled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("purchases").select("invoice_date, grand_total"),
      ]);

      type SaleRow = { date: string; total: number };
      type PurRow  = { invoice_date: string; grand_total: number };

      const sales     = (salesRes.data ?? []) as SaleRow[];
      const purchases = (purchasesRes.data ?? []) as PurRow[];

      const todaySales    = sales.filter((r) => r.date === today).reduce((s, r) => s + r.total, 0);
      const monthSales    = sales.filter((r) => r.date >= monthStart).reduce((s, r) => s + r.total, 0);
      const overallSales  = sales.reduce((s, r) => s + r.total, 0);

      const todayPur   = purchases.filter((r) => r.invoice_date === today).reduce((s, r) => s + r.grand_total, 0);
      const monthPur   = purchases.filter((r) => r.invoice_date >= monthStart).reduce((s, r) => s + r.grand_total, 0);
      const overallPur = purchases.reduce((s, r) => s + r.grand_total, 0);

      return {
        today:   todaySales   - todayPur,
        month:   monthSales   - monthPur,
        overall: overallSales - overallPur,
      };
    },
  });

  const rows = [
    { label: "Today",       value: data?.today   ?? 0 },
    { label: "This Month",  value: data?.month   ?? 0 },
    { label: "Overall",     value: data?.overall ?? 0 },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-600 to-teal-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Estimated Gross Profit
          </CardTitle>
        </div>
        <p className="text-xs text-emerald-100">Sales Value − Purchase Value</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
        ) : (
          <div className="space-y-3">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="flex items-center gap-2">
                  {value >= 0
                    ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                    : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <p className={`text-base font-bold tabular-nums ${value >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {fmtINR(Math.abs(value))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 4. Fast Moving Products ──────────────────────────────────

function FastMovingProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "fast-moving"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("bill_items")
        .select("product_id, quantity, total, product:products(name, brand)");
      type Row = { product_id: string; quantity: number; total: number; product: { name: string; brand: string | null } | null };
      const map = new Map<string, { name: string; brand: string; quantity: number; revenue: number }>();
      for (const item of (data ?? []) as Row[]) {
        const p = Array.isArray(item.product) ? (item.product[0] ?? null) : item.product;
        const name = p?.name ?? "Unknown";
        const brand = p?.brand ?? "";
        const ex = map.get(item.product_id) ?? { name, brand, quantity: 0, revenue: 0 };
        map.set(item.product_id, { name, brand, quantity: ex.quantity + item.quantity, revenue: ex.revenue + item.total });
      }
      return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-rose-500 to-pink-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4" /> Fast Moving Products
          </CardTitle>
        </div>
        <p className="text-xs text-rose-100">Top 10 by units sold</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.map((p, i) => {
              const maxQty = data[0].quantity;
              return (
                <div key={p.name + i} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-rose-700">{p.quantity} units</p>
                    <p className="text-[10px] text-muted-foreground">{fmtK(p.revenue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 5. Slow Moving Products ──────────────────────────────────

function SlowMovingProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "slow-moving"],
    queryFn: async () => {
      // Get products with stock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invData } = await (supabase as any)
        .from("inventory")
        .select("product_id, quantity, product:products(name, brand)")
        .gt("quantity", 0);

      type InvRow = { product_id: string; quantity: number; product: { name: string; brand: string | null } | null };
      const inventoryMap = new Map<string, { name: string; stock: number }>();
      for (const row of (data ?? invData ?? []) as InvRow[]) {
        const p = Array.isArray(row.product) ? (row.product[0] ?? null) : row.product;
        if (p) inventoryMap.set(row.product_id, { name: p.name, stock: row.quantity });
      }

      // Get sales per product
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: billItemData } = await (supabase as any)
        .from("bill_items")
        .select("product_id, quantity");
      type BillRow = { product_id: string; quantity: number };
      const salesMap = new Map<string, number>();
      for (const row of (billItemData ?? []) as BillRow[]) {
        salesMap.set(row.product_id, (salesMap.get(row.product_id) ?? 0) + row.quantity);
      }

      // Products in stock sorted by sales asc (lowest sales = slow moving)
      return [...inventoryMap.entries()]
        .map(([id, info]) => ({ ...info, sold: salesMap.get(id) ?? 0, id }))
        .sort((a, b) => a.sold - b.sold)
        .slice(0, 10);
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-600 to-gray-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Snail className="h-4 w-4" /> Slow Moving Products
          </CardTitle>
        </div>
        <p className="text-xs text-slate-200">In-stock products with lowest sales</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Snail className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No inventory data yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.map((p, i) => (
              <div key={p.id + i} className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">Stock: {p.stock} units</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0 bg-slate-100 text-slate-600">
                  {p.sold === 0 ? "0 sold" : `${p.sold} sold`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 6. Low Stock Alert ───────────────────────────────────────

function LowStockAlert() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "low-stock-alert"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("inventory")
        .select("id, quantity, reorder_level, min_quantity, product:products(name, unit, brand)")
        .gt("quantity", 0);
      type Row = {
        id: string; quantity: number; reorder_level: number | null;
        min_quantity: number | null;
        product: { name: string; unit: string; brand: string | null } | null;
      };
      return ((data ?? []) as Row[])
        .map((r) => {
          const p = Array.isArray(r.product) ? (r.product[0] ?? null) : r.product;
          const threshold = r.reorder_level ?? r.min_quantity ?? 5;
          return { ...r, product: p, threshold };
        })
        .filter((r) => r.quantity <= r.threshold)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 15);
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-red-600 to-rose-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Low Stock Alert
          </CardTitle>
          {data?.length ? (
            <Badge className="bg-white/20 text-white text-xs border-0">{data.length} items</Badge>
          ) : null}
        </div>
        <p className="text-xs text-red-100">Products below minimum stock level</p>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">All products are well-stocked</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.map((item) => {
              const urgency = item.quantity === 0 ? "bg-red-50 border-red-200"
                : item.quantity <= Math.ceil(item.threshold / 2) ? "bg-orange-50 border-orange-200"
                : "bg-amber-50 border-amber-200";
              const textCls = item.quantity === 0 ? "text-red-700"
                : item.quantity <= Math.ceil(item.threshold / 2) ? "text-orange-700"
                : "text-amber-700";
              return (
                <div key={item.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${urgency}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{item.product?.name ?? "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">Min: {item.threshold} {item.product?.unit ?? ""}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 border-0 ${textCls} bg-white/70`}>
                    {item.quantity} {item.product?.unit ?? ""} left
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 7. Monthly Business Summary ─────────────────────────────

function MonthlyBusinessSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "monthly-summary"],
    queryFn: async () => {
      const months = last6Months();
      const startDate = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;

      const [billsRes, purchasesRes, paymentsRes, purchasePaymentsRes, outstandingRes, payableRes] =
        await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("bills").select("date, total").neq("status", "cancelled").gte("date", startDate),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("purchases").select("invoice_date, grand_total").gte("invoice_date", startDate),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("payments").select("payment_date, amount").gte("payment_date", startDate),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("purchase_payments").select("payment_date, amount").gte("payment_date", startDate),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("customers").select("pending_balance").gt("pending_balance", 0),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("companies").select("outstanding_due").gt("outstanding_due", 0),
        ]);

      const salesMap   = new Map<string, number>();
      const purMap     = new Map<string, number>();
      const collMap    = new Map<string, number>();
      const compPmtMap = new Map<string, number>();

      type DateAmt = { date?: string; invoice_date?: string; payment_date?: string; total?: number; grand_total?: number; amount?: number };

      for (const r of (billsRes.data ?? []) as DateAmt[]) {
        const k = r.date!.slice(0, 7);
        salesMap.set(k, (salesMap.get(k) ?? 0) + (r.total ?? 0));
      }
      for (const r of (purchasesRes.data ?? []) as DateAmt[]) {
        const k = r.invoice_date!.slice(0, 7);
        purMap.set(k, (purMap.get(k) ?? 0) + (r.grand_total ?? 0));
      }
      for (const r of (paymentsRes.data ?? []) as DateAmt[]) {
        const k = r.payment_date!.slice(0, 7);
        collMap.set(k, (collMap.get(k) ?? 0) + (r.amount ?? 0));
      }
      for (const r of (purchasePaymentsRes.data ?? []) as DateAmt[]) {
        const k = r.payment_date!.slice(0, 7);
        compPmtMap.set(k, (compPmtMap.get(k) ?? 0) + (r.amount ?? 0));
      }

      const outstandingReceivable = ((outstandingRes.data ?? []) as { pending_balance: number }[])
        .reduce((s, r) => s + r.pending_balance, 0);
      const outstandingPayable = ((payableRes.data ?? []) as { outstanding_due: number }[])
        .reduce((s, r) => s + r.outstanding_due, 0);

      const chartData = months.map(({ key, label }) => ({
        label,
        Sales:            salesMap.get(key)   ?? 0,
        Purchases:        purMap.get(key)      ?? 0,
        Collections:      collMap.get(key)     ?? 0,
        "Co. Payments":   compPmtMap.get(key)  ?? 0,
      }));

      return { chartData, outstandingReceivable, outstandingPayable };
    },
  });

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-600 to-purple-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Monthly Business Summary
          </CardTitle>
        </div>
        <p className="text-xs text-violet-100">Last 6 months overview</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {isLoading ? (
          <div className="h-56 animate-pulse rounded bg-muted" />
        ) : (
          <>
            {/* Outstanding summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Outstanding Receivable</p>
                <p className="text-lg font-black text-amber-700">{fmtK(data?.outstandingReceivable ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">Outstanding Payable</p>
                <p className="text-lg font-black text-red-700">{fmtK(data?.outstandingPayable ?? 0)}</p>
              </div>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.chartData ?? []} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<BarTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Sales"          fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="Purchases"      fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="Collections"    fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="Co. Payments"   fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Export ─────────────────────────────────────────────

export default function BusinessInsights() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        📊 Business Insights
      </h3>

      {/* Brand-wise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BrandWiseSales />
        <BrandWisePurchases />
      </div>

      {/* Profit + Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EstimatedGrossProfit />
        <MonthlyBusinessSummary />
      </div>

      {/* Products + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FastMovingProducts />
        <SlowMovingProducts />
      </div>

      {/* Low Stock full width */}
      <LowStockAlert />
    </div>
  );
}
