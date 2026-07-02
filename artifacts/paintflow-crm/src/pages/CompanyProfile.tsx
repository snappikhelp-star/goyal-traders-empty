import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/hooks/useCompanies";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, Building2, Phone, Mail, CreditCard, Clock,
  FileText, Wallet, TrendingUp, ShoppingCart, Search, X,
  Plus, Printer, IndianRupee, CalendarDays,
} from "lucide-react";
import type { Purchase, PurchasePayment } from "@/hooks/usePurchases";

// ─── helpers ─────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmtINR  = (n: number) => INR.format(n);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
    due:     "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function methodLabel(m: string) {
  const labels: Record<string, string> = {
    cash: "Cash", upi: "UPI", cheque: "Cheque", bank_transfer: "Bank Transfer",
  };
  return labels[m] ?? m;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── data hook ───────────────────────────────────────────────

function useCompanyLedger(companyId: string) {
  return useQuery({
    queryKey: ["company-ledger", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [purRes, pmtRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("purchases")
          .select("id, invoice_number, invoice_date, grand_total, paid_amount, due_amount, status, payment_method, due_date")
          .eq("company_id", companyId)
          .order("invoice_date", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("purchase_payments")
          .select("id, purchase_id, payment_date, amount, payment_method, reference, notes")
          .eq("company_id", companyId)
          .order("payment_date", { ascending: false }),
      ]);
      return {
        purchases: (purRes.data ?? []) as Purchase[],
        payments:  (pmtRes.data ?? []) as PurchasePayment[],
      };
    },
  });
}

// ─── 1. Company Summary ───────────────────────────────────────

function CompanySummaryCard({ companyId }: { companyId: string }) {
  const { data: co, isLoading } = useCompany(companyId);

  const brandColor = (brand: string | null) => {
    if (brand === "JSW Paints") return "bg-blue-50 text-blue-700 border-blue-200";
    if (brand === "Birla Opus") return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-muted text-muted-foreground";
  };

  type CompanyWithStats = typeof co & {
    total_purchase?: number;
    total_paid?: number;
    outstanding_due?: number;
    last_purchase_date?: string | null;
    last_payment_date?: string | null;
  };
  const company = co as CompanyWithStats | undefined;

  const kpis = [
    { label: "Total Purchases", value: fmtINR(company?.total_purchase ?? 0), icon: ShoppingCart, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Total Paid",      value: fmtINR(company?.total_paid ?? 0),      icon: IndianRupee,  color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Outstanding Due", value: fmtINR(company?.outstanding_due ?? 0), icon: Wallet,       color: (company?.outstanding_due ?? 0) > 0 ? "text-red-700" : "text-emerald-700", bg: (company?.outstanding_due ?? 0) > 0 ? "bg-red-50" : "bg-emerald-50" },
    { label: "Last Purchase",   value: fmtDate(company?.last_purchase_date),   icon: CalendarDays, color: "text-orange-700", bg: "bg-orange-50" },
    { label: "Last Payment",    value: fmtDate(company?.last_payment_date),    icon: Clock,        color: "text-purple-700", bg: "bg-purple-50" },
  ];

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted" />;
  }
  if (!company) return null;

  const initials = company.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-700 to-slate-600">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white text-xl font-bold select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{company.name}</h2>
              {company.brand && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${brandColor(company.brand)}`}>
                  {company.brand}
                </span>
              )}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${company.status === "active" ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
                {company.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-300">
              {company.contact_person && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {company.contact_person}
                </span>
              )}
              {company.mobile && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {company.mobile}
                </span>
              )}
              {company.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {company.email}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
              {company.gstin && <span>GSTIN: <span className="font-mono text-slate-300">{company.gstin}</span></span>}
              <span>Terms: {company.payment_terms_days} days</span>
              <span>Credit Limit: {fmtINR(company.credit_limit)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl ${bg} border border-transparent px-3 py-2.5 space-y-1`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2. Purchase Ledger ───────────────────────────────────────

function PurchaseLedger({ purchases, isLoading }: { purchases: Purchase[]; isLoading: boolean }) {
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (search && !p.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
      if (status && p.status !== status) return false;
      if (dateFrom && p.invoice_date < dateFrom) return false;
      if (dateTo   && p.invoice_date > dateTo)   return false;
      return true;
    });
  }, [purchases, search, status, dateFrom, dateTo]);

  const totals = useMemo(() => ({
    amount: filtered.reduce((s, p) => s + p.grand_total, 0),
    paid:   filtered.reduce((s, p) => s + p.paid_amount, 0),
    due:    filtered.reduce((s, p) => s + p.due_amount,  0),
  }), [filtered]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Invoice number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={status || "_all"} onValueChange={(v) => setStatus(v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="due">Due</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="h-8 w-36 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" className="h-8 w-36 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(search || status || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setSearch(""); setStatus(""); setDateFrom(""); setDateTo(""); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 rounded-lg bg-muted/40 px-4 py-2 text-sm">
        <span>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
        <span className="text-blue-700 font-medium">Total: {fmtINR(totals.amount)}</span>
        <span className="text-emerald-700 font-medium">Paid: {fmtINR(totals.paid)}</span>
        <span className="text-red-700 font-medium">Due: {fmtINR(totals.due)}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Invoice #</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold text-right">Paid</TableHead>
              <TableHead className="font-semibold text-right">Due</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" style={{ width: j === 0 ? 80 : 60 }} /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  No purchases found
                </TableCell>
              </TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="text-sm">{fmtDate(p.invoice_date)}</TableCell>
                <TableCell className="font-mono text-sm font-medium">{p.invoice_number}</TableCell>
                <TableCell className="text-right text-sm font-medium">{fmtINR(p.grand_total)}</TableCell>
                <TableCell className="text-right text-sm text-emerald-700">{fmtINR(p.paid_amount)}</TableCell>
                <TableCell className="text-right text-sm text-red-700 font-medium">{fmtINR(p.due_amount)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Link to={`/purchases/${p.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── 3. Payment Ledger ────────────────────────────────────────

function PaymentLedger({ payments, isLoading }: { payments: PurchasePayment[]; isLoading: boolean }) {
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 rounded-lg bg-muted/40 px-4 py-2 text-sm">
        <span>{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
        <span className="text-emerald-700 font-medium">Total Paid: {fmtINR(total)}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Method</TableHead>
              <TableHead className="font-semibold">Reference</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}><div className="h-4 animate-pulse rounded bg-muted" style={{ width: j === 0 ? 80 : 60 }} /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                  No payments recorded
                </TableCell>
              </TableRow>
            ) : payments.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="text-sm">{fmtDate(p.payment_date)}</TableCell>
                <TableCell className="text-right text-sm font-bold text-emerald-700">{fmtINR(p.amount)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {methodLabel(p.payment_method)}
                  </span>
                </TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{p.reference ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.notes ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── 4. Running Balance ───────────────────────────────────────

function RunningBalance({ purchases, payments, isLoading }: {
  purchases: Purchase[];
  payments: PurchasePayment[];
  isLoading: boolean;
}) {
  const ledger = useMemo(() => {
    type Entry = {
      date: string;
      type: "purchase" | "payment";
      label: string;
      amount: number;
      balance: number;
    };

    const events: Omit<Entry, "balance">[] = [
      ...purchases.map((p) => ({
        date: p.invoice_date,
        type: "purchase" as const,
        label: `Purchase — ${p.invoice_number}`,
        amount: p.grand_total,
      })),
      ...payments.map((p) => ({
        date: p.payment_date,
        type: "payment" as const,
        label: `Payment${p.reference ? ` (${p.reference})` : ""}`,
        amount: p.amount,
      })),
    ];

    events.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    let balance = 0;
    return events.map((e): Entry => {
      if (e.type === "purchase") balance += e.amount;
      else balance -= e.amount;
      return { ...e, balance };
    }).reverse();
  }, [purchases, payments]);

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (ledger.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2 text-muted-foreground">
        <Wallet className="h-8 w-8 opacity-30" />
        <p className="text-sm">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Transaction</TableHead>
            <TableHead className="font-semibold text-right">Debit (Purchase)</TableHead>
            <TableHead className="font-semibold text-right">Credit (Payment)</TableHead>
            <TableHead className="font-semibold text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledger.map((e, i) => (
            <TableRow key={i} className="hover:bg-muted/20 transition-colors">
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</TableCell>
              <TableCell className="text-sm">{e.label}</TableCell>
              <TableCell className="text-right text-sm">
                {e.type === "purchase" ? <span className="font-medium text-red-700">{fmtINR(e.amount)}</span> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right text-sm">
                {e.type === "payment" ? <span className="font-medium text-emerald-700">{fmtINR(e.amount)}</span> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right text-sm font-bold">
                <span className={e.balance > 0 ? "text-red-700" : "text-emerald-700"}>
                  {fmtINR(Math.abs(e.balance))}
                  {e.balance > 0 ? " DR" : e.balance < 0 ? " CR" : ""}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── 5. Company Analytics ─────────────────────────────────────

function CompanyAnalytics({ purchases, payments, isLoading }: {
  purchases: Purchase[];
  payments: PurchasePayment[];
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; purchases: number; payments: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: MONTH_LABELS[d.getMonth()], purchases: 0, payments: 0 });
    }

    for (const p of purchases) {
      const d = new Date(p.invoice_date);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo <= 5) {
        months[5 - monthsAgo].purchases += p.grand_total;
      }
    }
    for (const p of payments) {
      const d = new Date(p.payment_date);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo <= 5) {
        months[5 - monthsAgo].payments += p.amount;
      }
    }
    return months;
  }, [purchases, payments]);

  const outstandingTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; outstanding: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0).toISOString().split("T")[0];
      let outstanding = 0;
      for (const p of purchases) {
        if (p.invoice_date <= end) outstanding += p.due_amount;
      }
      months.push({ month: MONTH_LABELS[d.getMonth()], outstanding: Math.max(0, outstanding) });
    }
    return months;
  }, [purchases]);

  if (isLoading) return <div className="h-60 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Monthly Purchase &amp; Payment Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={(val: number, name: string) => [fmtINR(val), name === "purchases" ? "Purchases" : "Payments"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="payments"  name="Payments"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-red-600" />
            Outstanding Balance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={outstandingTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(val: number) => [fmtINR(val), "Outstanding"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companyId = id ?? "";

  const { data: company } = useCompany(companyId);
  const { data: ledger, isLoading } = useCompanyLedger(companyId);

  const purchases = ledger?.purchases ?? [];
  const payments  = ledger?.payments  ?? [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={company?.name ?? "Company Details"}
        subtitle="Supplier account &amp; ledger"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print Statement
            </Button>
            <Link to={`/purchases/new`}>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Add Purchase
              </Button>
            </Link>
            <Link to="/purchases">
              <Button size="sm" className="gap-2">
                <CreditCard className="h-4 w-4" /> Record Payment
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate("/companies")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Companies
        </button>

        {/* 1. Summary */}
        <CompanySummaryCard companyId={companyId} />

        {/* 2–5. Tabbed sections */}
        <Tabs defaultValue="purchases" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="purchases" className="text-sm gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Purchase Ledger
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-sm gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Payment Ledger
            </TabsTrigger>
            <TabsTrigger value="balance" className="text-sm gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" /> Running Balance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="mt-0">
            <PurchaseLedger purchases={purchases} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <PaymentLedger payments={payments} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="balance" className="mt-0">
            <RunningBalance purchases={purchases} payments={payments} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <CompanyAnalytics purchases={purchases} payments={payments} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
