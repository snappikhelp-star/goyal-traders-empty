import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Printer, Download, IndianRupee, TrendingUp,
  Search, FileText, Wallet, Activity, BarChart2,
  CheckCircle2, AlertCircle, Clock, AlertTriangle,
  Receipt, CreditCard, ChevronUp, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useCustomerBills,
  useCustomerPayments,
  useCustomerLedger,
  useCustomerMonthlyTrend,
  useCustomerOutstandingBills,
} from "@/hooks/useCustomers";
import { useRecordPayment, PAYMENT_METHOD_LABELS } from "@/hooks/usePayments";
import type { Customer, CustomerStats, Bill, Payment } from "@/types";
import type { PaymentMethod } from "@/hooks/usePayments";

// ─── Formatters ──────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const fmtINR = (n: number) => INR.format(n);
const fmtK = (n: number) =>
  n >= 100_000
    ? `₹${(n / 100_000).toFixed(1)}L`
    : n >= 1_000
    ? `₹${(n / 1_000).toFixed(0)}K`
    : `₹${n}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().split("T")[0];

// ─── Status styles ───────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
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

const METHOD_STYLE: Record<string, string> = {
  cash:          "bg-green-100 text-green-700",
  upi:           "bg-purple-100 text-purple-700",
  bank_transfer: "bg-blue-100 text-blue-700",
  cheque:        "bg-amber-100 text-amber-700",
  card:          "bg-indigo-100 text-indigo-700",
  other:         "bg-gray-100 text-gray-700",
};

// ─── Skeleton ────────────────────────────────────────────────

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-10 text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

// ─── 1. Outstanding Highlight Badge ─────────────────────────

function OutstandingBadge({ amount }: { amount: number }) {
  if (amount <= 0)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
        🟢 No Due
      </span>
    );
  if (amount <= 5_000)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
        🟡 Small Due · {fmtINR(amount)}
      </span>
    );
  if (amount <= 25_000)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
        🟠 Medium Due · {fmtINR(amount)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
      🔴 High Due · {fmtINR(amount)}
    </span>
  );
}

// ─── 2. KPI Card ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-lg font-bold truncate">{value}</p>
            )}
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 3. Record Payment Dialog ────────────────────────────────

function RecordPaymentDialog({
  customerId,
  open,
  onClose,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data: outstanding, isLoading } = useCustomerOutstandingBills(customerId);
  const recordPayment = useRecordPayment();

  const selectedBill = outstanding?.find((b) => b.id === billId);

  const handleSubmit = () => {
    if (!billId || !amount || Number(amount) <= 0) return;
    recordPayment.mutate(
      {
        billId,
        customerId,
        amount: Number(amount),
        method,
        date,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setBillId("");
          setAmount("");
          setMethod("cash");
          setDate(today());
          setReference("");
          setNotes("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Bill selector */}
          <div className="space-y-1.5">
            <Label>Select Invoice *</Label>
            {isLoading ? (
              <div className="h-10 animate-pulse rounded bg-muted" />
            ) : !outstanding || outstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded border border-border p-3">
                No outstanding invoices for this customer.
              </p>
            ) : (
              <Select value={billId} onValueChange={(v) => {
                setBillId(v);
                const b = outstanding.find((x) => x.id === v);
                if (b) setAmount(String(b.due));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose invoice…" />
                </SelectTrigger>
                <SelectContent>
                  {outstanding.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="font-mono">{b.bill_number}</span>
                      <span className="ml-2 text-muted-foreground text-xs">
                        Due {fmtINR(b.due)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedBill && (
              <p className="text-xs text-muted-foreground">
                Invoice total {fmtINR(selectedBill.total)} · Paid {fmtINR(selectedBill.paid_amount)} · Due {fmtINR(selectedBill.due)}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Method + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>Reference <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="UPI Ref / Cheque no. / TXN ID…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="Any remarks…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!billId || !amount || Number(amount) <= 0 || recordPayment.isPending}
          >
            {recordPayment.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 4. Sales Ledger Tab ─────────────────────────────────────

function SalesLedgerSection({ customerId }: { customerId: string }) {
  const { data: allBills, isLoading, isError } = useCustomerBills(customerId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const bills = useMemo(() => {
    let rows = (allBills ?? []) as Bill[];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter((b) => b.bill_number?.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") rows = rows.filter((b) => b.status === statusFilter);
    if (dateFrom) rows = rows.filter((b) => b.date >= dateFrom);
    if (dateTo) rows = rows.filter((b) => b.date <= dateTo);
    return rows;
  }, [allBills, search, statusFilter, dateFrom, dateTo]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Sales Ledger</CardTitle>
            <CardDescription className="text-xs">All invoices raised for this customer</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs w-36"
                placeholder="Invoice #…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Part. Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 text-xs w-34"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              className="h-8 text-xs w-34"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-32">Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={7} />
              ) : isError ? (
                <EmptyRow cols={7} message="Failed to load invoices — please refresh" />
              ) : bills.length === 0 ? (
                <EmptyRow cols={7} message="No invoices found" />
              ) : (
                bills.map((bill) => {
                  const due = Math.max(bill.total - (bill.paid_amount ?? 0), 0);
                  return (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm font-medium">
                        <Link to={`/bills/${bill.id}`} className="text-primary hover:underline">
                          {bill.bill_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(bill.date)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmtINR(bill.total)}</TableCell>
                      <TableCell className="text-right text-green-700 tabular-nums">{fmtINR(bill.paid_amount ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {due > 0 ? (
                          <span className="text-red-600 font-medium">{fmtINR(due)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[bill.status] ?? "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABEL[bill.status] ?? bill.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link to={`/bills/${bill.id}`}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 5. Payment History Tab ──────────────────────────────────

function PaymentHistorySection({ customerId }: { customerId: string }) {
  const { data: payments, isLoading, isError } = useCustomerPayments(customerId);
  const rows = (payments ?? []) as Payment[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Payment History</CardTitle>
        <CardDescription className="text-xs">All payments received from this customer</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : isError ? (
                <EmptyRow cols={6} message="Failed to load payments — please refresh" />
              ) : rows.length === 0 ? (
                <EmptyRow cols={6} message="No payments recorded" />
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(p.payment_date)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700 tabular-nums">
                      {fmtINR(p.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${METHOD_STYLE[p.payment_method] ?? "bg-muted text-muted-foreground"}`}>
                        {PAYMENT_METHOD_LABELS[p.payment_method as PaymentMethod] ?? p.payment_method}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.reference ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.bill?.bill_number ? (
                        <Link to={`/bills/${p.bill_id}`} className="text-primary hover:underline">
                          {p.bill.bill_number}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {p.notes ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 6. Running Balance ──────────────────────────────────────

function RunningBalanceSection({ customerId }: { customerId: string }) {
  const { data: ledger, isLoading, isError } = useCustomerLedger(customerId);

  // Show newest first for display
  const rows = useMemo(() => [...(ledger ?? [])].reverse(), [ledger]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Running Balance</CardTitle>
        <CardDescription className="text-xs">Chronological account statement</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit (Invoice)</TableHead>
                <TableHead className="text-right">Credit (Payment)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : isError ? (
                <EmptyRow cols={6} message="Failed to load ledger — please refresh" />
              ) : !rows || rows.length === 0 ? (
                <EmptyRow cols={6} message="No transactions yet" />
              ) : (
                rows.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={`hover:bg-muted/30 ${entry.type === "invoice" ? "bg-blue-50/30" : "bg-green-50/30"}`}
                  >
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      {entry.type === "invoice" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                          <Receipt className="h-3 w-3" /> Invoice
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CreditCard className="h-3 w-3" /> Payment
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.billId ? (
                        <Link to={`/bills/${entry.billId}`} className="text-primary hover:underline">
                          {entry.billNumber ?? entry.billId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.type === "invoice" ? (
                        <span className="font-semibold text-blue-700">{fmtINR(entry.invoiceTotal!)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.type === "payment" ? (
                        <span className="font-semibold text-green-700">{fmtINR(entry.paymentAmount!)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {entry.balance === 0 ? (
                        <span className="text-green-700">Settled</span>
                      ) : entry.balance > 0 ? (
                        <span className="text-red-600">{fmtINR(entry.balance)}</span>
                      ) : (
                        <span className="text-blue-600">Cr {fmtINR(-entry.balance)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 7. Customer Analytics ───────────────────────────────────

function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtINR(p.value)}
        </p>
      ))}
    </div>
  );
}

function AnalyticsSection({ customerId }: { customerId: string }) {
  const { data: trend, isLoading } = useCustomerMonthlyTrend(customerId);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!trend || trend.every((m) => m.purchases === 0 && m.payments === 0)) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No transaction data available for charts
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Purchase Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Monthly Purchase Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={48} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            Monthly Payment Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={48} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="payments" name="Payments" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Purchase vs Payment overlay */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-600" />
            Purchase vs Payment — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPurchase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPayment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={48} />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="purchases"
                name="Purchases"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradPurchase)"
              />
              <Area
                type="monotone"
                dataKey="payments"
                name="Payments"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradPayment)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export: Customer Ledger ────────────────────────────

interface CustomerLedgerProps {
  customerId: string;
  customer: Customer;
  stats: CustomerStats | undefined;
  loadingStats: boolean;
}

export function CustomerLedger({
  customerId,
  customer,
  stats,
  loadingStats,
}: CustomerLedgerProps) {
  const navigate = useNavigate();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Derive last payment date from payments query
  const { data: payments } = useCustomerPayments(customerId);
  const lastPaymentDate = useMemo(() => {
    const rows = (payments ?? []) as Payment[];
    if (rows.length === 0) return null;
    return rows.reduce((latest, p) =>
      p.payment_date > (latest ?? "") ? p.payment_date : latest,
      null as string | null
    );
  }, [payments]);

  // Derive preferred payment method (most common)
  const preferredMethod = useMemo(() => {
    const rows = (payments ?? []) as Payment[];
    if (rows.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const p of rows) counts[p.payment_method] = (counts[p.payment_method] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? PAYMENT_METHOD_LABELS[top[0] as PaymentMethod] ?? top[0] : null;
  }, [payments]);

  const outstanding = stats?.pendingAmount ?? 0;

  const handlePrintLedger = () => window.print();

  const handleExportCSV = () => {
    const rows = [
      ["Customer Ledger Export"],
      ["Customer", customer.name],
      ["Mobile", customer.phone ?? ""],
      ["Address", [customer.address, customer.city, customer.state].filter(Boolean).join(", ")],
      ["Outstanding", String(outstanding)],
      [],
      ["Total Purchase", String(stats?.totalSpent ?? 0)],
      ["Total Paid", String(stats?.totalPaid ?? 0)],
      ["Outstanding Due", String(outstanding)],
      ["Last Purchase Date", stats?.lastPurchase ?? ""],
      ["Last Payment Date", lastPaymentDate ?? ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${customer.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Customer Summary ─────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-bold">{customer.name}</h3>
                <OutstandingBadge amount={outstanding} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
                {customer.phone && (
                  <span>📞 {customer.phone}</span>
                )}
                {(customer.address || customer.city) && (
                  <span>
                    📍 {[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {preferredMethod && (
                  <span>💳 Prefers {preferredMethod}</span>
                )}
              </div>
            </div>

            {/* Smart Actions */}
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/bills/new`)}
              >
                <Plus className="h-3.5 w-3.5" /> Create Bill
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setPaymentDialogOpen(true)}
              >
                <IndianRupee className="h-3.5 w-3.5" /> Record Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handlePrintLedger}
              >
                <Printer className="h-3.5 w-3.5" /> Print Ledger
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleExportCSV}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
            <KpiCard
              label="Total Purchase"
              value={fmtINR(stats?.totalSpent ?? 0)}
              sub={`${stats?.totalBills ?? 0} invoice${(stats?.totalBills ?? 0) !== 1 ? "s" : ""}`}
              icon={TrendingUp}
              color="bg-blue-50 text-blue-600"
              loading={loadingStats}
            />
            <KpiCard
              label="Total Paid"
              value={fmtINR(stats?.totalPaid ?? 0)}
              icon={CheckCircle2}
              color="bg-green-50 text-green-600"
              loading={loadingStats}
            />
            <KpiCard
              label="Outstanding Due"
              value={fmtINR(outstanding)}
              sub={outstanding > 0 ? "balance pending" : "all clear"}
              icon={outstanding > 0 ? AlertCircle : CheckCircle2}
              color={outstanding > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}
              loading={loadingStats}
            />
            <KpiCard
              label="Last Purchase"
              value={stats?.lastPurchase ? fmtDate(stats.lastPurchase) : "—"}
              icon={FileText}
              color="bg-purple-50 text-purple-600"
              loading={loadingStats}
            />
            <KpiCard
              label="Last Payment"
              value={lastPaymentDate ? fmtDate(lastPaymentDate) : "—"}
              icon={Wallet}
              color="bg-amber-50 text-amber-600"
              loading={loadingStats}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Sales Ledger ─────────────────────────────────── */}
      <SalesLedgerSection customerId={customerId} />

      {/* ── 3. Payment History ──────────────────────────────── */}
      <PaymentHistorySection customerId={customerId} />

      {/* ── 4. Running Balance ──────────────────────────────── */}
      <RunningBalanceSection customerId={customerId} />

      {/* ── 5. Analytics ────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart2 className="h-4 w-4" /> Customer Analytics
        </h3>
        <AnalyticsSection customerId={customerId} />
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        customerId={customerId}
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
      />
    </div>
  );
}
