import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Printer,
  Download,
  FileEdit,
  XCircle,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Receipt,
  MessageCircle,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShopProfile } from "@/lib/shopProfile";
import {
  buildInvoiceMessage,
  buildReminderMessage,
  openWhatsApp,
} from "@/lib/whatsapp";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useBill,
  useBillItems,
  useBillPayments,
  useShopSettings,
} from "@/hooks/useBillView";
import type { BillStatus } from "@/types";
import {
  useRecordPayment,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/hooks/usePayments";

// ─── Helpers ──────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
function fmtINR(n: number) {
  return INR.format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPaymentMethod(m: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    credit: "Credit",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    other: "Other",
  };
  return map[m] ?? m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Status config ────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BillStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  draft:          { label: "Draft",          badge: "bg-gray-100 text-gray-700 border border-gray-200",    icon: <Clock className="h-3.5 w-3.5" /> },
  sent:           { label: "Sent",           badge: "bg-blue-100 text-blue-700 border border-blue-200",     icon: <Receipt className="h-3.5 w-3.5" /> },
  paid:           { label: "Paid",           badge: "bg-green-100 text-green-700 border border-green-200",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  overdue:        { label: "Overdue",        badge: "bg-red-100 text-red-700 border border-red-200",        icon: <AlertCircle className="h-3.5 w-3.5" /> },
  cancelled:      { label: "Cancelled",      badge: "bg-orange-100 text-orange-700 border border-orange-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  partially_paid: { label: "Partially Paid", badge: "bg-amber-100 text-amber-700 border border-amber-200",  icon: <Banknote className="h-3.5 w-3.5" /> },
  unpaid:         { label: "Unpaid",         badge: "bg-slate-100 text-slate-600 border border-slate-200",  icon: <Clock className="h-3.5 w-3.5" /> },
};

function StatusBadge({ status }: { status: BillStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    badge: "bg-gray-100 text-gray-700",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground">
        {message ?? "Invoice not found"}
      </p>
      <Button variant="outline" size="sm" onClick={() => navigate("/bills")}>
        Back to Bills
      </Button>
    </div>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────

function RecordPaymentDialog({
  billId,
  customerId,
  billNumber,
  remaining,
  open,
  onClose,
}: {
  billId:     string;
  customerId: string;
  billNumber: string;
  remaining:  number;
  open:       boolean;
  onClose:    () => void;
}) {
  const [amount,    setAmount]    = useState(remaining.toFixed(2));
  const [method,    setMethod]    = useState<PaymentMethod>("cash");
  const [date,      setDate]      = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes,     setNotes]     = useState("");
  const record = useRecordPayment();

  useEffect(() => {
    if (open) {
      setAmount(remaining.toFixed(2));
      setMethod("cash");
      setReference("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, remaining]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    record.mutate(
      {
        billId,
        customerId,
        amount: amt,
        method,
        date,
        reference: reference.trim() || undefined,
        notes:     notes.trim()     || undefined,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {billNumber} · Remaining: {fmtINR(remaining)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="rp-amount">Amount (₹)</Label>
            <Input
              id="rp-amount"
              type="number"
              step="0.01"
              min="1"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Max payable: {fmtINR(remaining)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
                  ([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-date">Payment Date</Label>
            <Input
              id="rp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-ref">
              Reference No.{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="rp-ref"
              placeholder="UPI TXN ID / Cheque No."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-notes">
              Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="rp-notes"
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={record.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending} className="gap-2">
              {record.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function BillView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: shopProfile } = useShopProfile();

  const [paymentOpen, setPaymentOpen] = useState(false);

  const billQ    = useBill(id!);
  const itemsQ   = useBillItems(id!);
  const paymentsQ = useBillPayments(id!);
  const shopQ    = useShopSettings();

  const bill     = billQ.data;
  const customer = bill?.customer;
  const items    = itemsQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const shop     = shopQ.data;

  const remainingBalance = Math.max(
    (bill?.total ?? 0) - (bill?.paid_amount ?? 0),
    0
  );

  // ── Print / PDF ──────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const prev = document.title;
    document.title = bill ? `Invoice-${bill.bill_number}` : "Invoice";
    window.print();
    document.title = prev;
  };

  // ── WhatsApp share / reminder ────────────────────────────────
  const handleShareWhatsApp = () => {
    if (!bill) return;
    const message = buildInvoiceMessage({
      shop: {
        shop_name: shopProfile.shop_name,
        phone: shopProfile.phone,
        gstin: shopProfile.gstin,
      },
      customerName: customer?.name ?? "Customer",
      billNumber: bill.bill_number,
      amount: bill.total,
      paidAmount: bill.paid_amount,
      dueDate: bill.due_date ?? null,
    });
    openWhatsApp(customer?.phone, message);
  };

  const handleSendReminder = () => {
    if (!bill) return;
    const message = buildReminderMessage({
      shop: {
        shop_name: shopProfile.shop_name,
        phone: shopProfile.phone,
      },
      customerName: customer?.name ?? "Customer",
      billNumber: bill.bill_number,
      remainingAmount: remainingBalance,
      dueDate: bill.due_date ?? null,
    });
    openWhatsApp(customer?.phone, message);
  };

  // ── Loading / error states ───────────────────────────────────
  if (billQ.isLoading) return <LoadingState />;
  if (billQ.error || !bill) {
    return <ErrorState message={(billQ.error as Error | null)?.message} />;
  }

  const status = bill.status as BillStatus;

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ══ Screen-only top bar ══════════════════════════════════ */}
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Left: back + bill number */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => navigate("/bills")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-bold text-sm truncate">
                  {bill.bill_number}
                </span>
                <StatusBadge status={status} />
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleDownloadPdf}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={handleShareWhatsApp}
                data-testid="bill-share-whatsapp-btn"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-1.5 text-muted-foreground"
                title="Coming soon"
              >
                <FileEdit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-1.5 text-muted-foreground"
                title="Coming soon"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-1.5 text-muted-foreground"
                title="Coming soon"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Page body ════════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: invoice + payment history ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* ════════════════════════════════════════════════════
                PRINTABLE INVOICE — rendered on screen AND in print
                ════════════════════════════════════════════════════ */}
            <div
              id="invoice-print-area"
              className="rounded-xl border border-border bg-white shadow-sm overflow-hidden"
            >
              {/* ── Invoice Header ── */}
              <div className="p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
                  {/* Shop / Seller */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      {/* Logo mark */}
                      <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <span className="text-primary-foreground font-black text-lg">G</span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-tight">
                          {shop?.shop_name ?? "GOYAL TRADERS"}
                        </h1>
                        <p className="text-xs text-muted-foreground">Paint & Hardware Store</p>
                      </div>
                    </div>
                    <div className="space-y-0.5 text-sm text-gray-600 pl-[60px]">
                      {shop?.address && <p>{shop.address}</p>}
                      {shop?.phone && <p>Phone: {shop.phone}</p>}
                      {shop?.email && <p>Email: {shop.email}</p>}
                      {shop?.tax_number && (
                        <p className="font-semibold text-gray-900">
                          GSTIN: {shop.tax_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Invoice metadata */}
                  <div className="sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                      TAX INVOICE
                    </p>
                    <p className="text-3xl font-black text-gray-900 mb-3">
                      {bill.bill_number}
                    </p>
                    <StatusBadge status={status} />
                    <div className="mt-4 space-y-1.5 text-sm">
                      <div className="flex sm:justify-end gap-6">
                        <span className="text-muted-foreground">Invoice Date</span>
                        <span className="font-medium text-gray-900">
                          {fmtDate(bill.date)}
                        </span>
                      </div>
                      {bill.due_date && (
                        <div className="flex sm:justify-end gap-6">
                          <span className="text-muted-foreground">Due Date</span>
                          <span className="font-medium text-gray-900">
                            {fmtDate(bill.due_date)}
                          </span>
                        </div>
                      )}
                      <div className="flex sm:justify-end gap-6">
                        <span className="text-muted-foreground">Payment</span>
                        <span className="font-medium text-gray-900">
                          {fmtPaymentMethod(bill.payment_method)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bill To ── */}
              <div className="px-8 pb-8">
                <div className="rounded-lg border border-border bg-muted/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Bill To
                  </p>
                  <p className="font-bold text-gray-900 text-lg leading-tight">
                    {customer?.name ?? "—"}
                  </p>
                  {customer?.phone && (
                    <p className="text-sm text-gray-600 mt-1">
                      📞 {customer.phone}
                    </p>
                  )}
                  {customer?.address && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {customer.address}
                    </p>
                  )}
                  {(customer?.city ?? customer?.state ?? customer?.pincode) && (
                    <p className="text-sm text-gray-600">
                      {[customer?.city, customer?.state, customer?.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {customer?.gst_number && (
                    <p className="text-sm font-semibold text-gray-900 mt-2">
                      GSTIN: {customer.gst_number}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Items Table ── */}
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-8">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Shade
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pack
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        GST
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No items found
                        </td>
                      </tr>
                    ) : (
                      items.map((item, i) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {item.product_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.brand ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.shade_number ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {item.pack_size ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtINR(item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-green-600">
                            {item.discount > 0 ? `−${fmtINR(item.discount)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {item.gst_rate}%
                            <span className="block text-[10px]">
                              {fmtINR(item.gst_amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                            {fmtINR(item.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Totals ── */}
              <div className="border-t border-border px-8 py-6">
                <div className="flex flex-col items-end">
                  <div className="w-full max-w-xs space-y-2 text-sm">
                    {/* Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums font-medium">
                        {fmtINR(bill.subtotal)}
                      </span>
                    </div>
                    {/* Discount */}
                    {bill.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="tabular-nums font-medium text-green-600">
                          −{fmtINR(bill.discount)}
                        </span>
                      </div>
                    )}
                    {/* GST */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST</span>
                      <span className="tabular-nums font-medium">
                        {fmtINR(bill.tax)}
                      </span>
                    </div>
                    {/* Grand Total */}
                    <div className="flex justify-between items-center border-t border-border pt-3 text-base font-black">
                      <span className="text-gray-900">Grand Total</span>
                      <span className="tabular-nums text-primary text-lg">
                        {fmtINR(bill.total)}
                      </span>
                    </div>
                    {/* Paid Amount */}
                    <div className="flex justify-between items-center border-t border-border pt-3">
                      <span className="text-muted-foreground">Paid Amount</span>
                      <span className="tabular-nums font-semibold text-green-600">
                        {fmtINR(bill.paid_amount)}
                      </span>
                    </div>
                    {/* Remaining Balance */}
                    <div className="flex justify-between items-center">
                      <span
                        className={`font-semibold ${
                          remainingBalance > 0 ? "text-amber-600" : "text-green-600"
                        }`}
                      >
                        Remaining Balance
                      </span>
                      <span
                        className={`tabular-nums font-bold ${
                          remainingBalance > 0 ? "text-amber-600" : "text-green-600"
                        }`}
                      >
                        {fmtINR(remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Notes ── */}
              {bill.notes && (
                <div className="border-t border-border px-8 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Notes
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {bill.notes}
                  </p>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="border-t border-border px-8 py-5 bg-gray-50 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Thank you for your business! 🎨
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {shop?.shop_name ?? "Goyal Traders"} •{" "}
                  {shop?.phone ? `Phone: ${shop.phone}` : ""}
                  {shop?.email ? ` • ${shop.email}` : ""}
                </p>
              </div>
            </div>
            {/* END #invoice-print-area */}

            {/* ── Payment History (screen only) ── */}
            <div className="no-print">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No payments recorded for this invoice.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Method
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Reference
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Notes
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {fmtDate(p.payment_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                                {fmtPaymentMethod(p.payment_method)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {p.reference ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                              {p.notes ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-green-600">
                              {fmtINR(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-sm font-semibold"
                          >
                            Total Paid
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-green-600">
                            {fmtINR(
                              payments.reduce((s, p) => s + p.amount, 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Right sidebar (screen only) ── */}
          <div className="no-print space-y-5">

            {/* Quick Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Grand Total */}
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">
                      Grand Total
                    </p>
                    <p className="text-lg font-black text-primary tabular-nums">
                      {fmtINR(bill.total)}
                    </p>
                  </div>
                  {/* Remaining */}
                  <div
                    className={`rounded-lg border p-3 ${
                      remainingBalance > 0
                        ? "bg-amber-50 border-amber-100"
                        : "bg-green-50 border-green-100"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        remainingBalance > 0 ? "text-amber-600/70" : "text-green-600/70"
                      }`}
                    >
                      Remaining
                    </p>
                    <p
                      className={`text-lg font-black tabular-nums ${
                        remainingBalance > 0 ? "text-amber-600" : "text-green-600"
                      }`}
                    >
                      {fmtINR(remainingBalance)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium text-right max-w-[140px] truncate">
                      {customer?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-medium">
                      {fmtPaymentMethod(bill.payment_method)}
                    </span>
                  </div>
                  {bill.due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due</span>
                      <span
                        className={`font-medium ${
                          new Date(bill.due_date) < new Date() &&
                          !["paid", "cancelled"].includes(bill.status)
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {fmtDate(bill.due_date)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action buttons stacked */}
                <div className="space-y-2">
                  {remainingBalance > 0 && !["paid", "cancelled"].includes(bill.status) && (
                    <Button
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Record Payment
                    </Button>
                  )}
                  <Button
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    data-testid="bill-share-whatsapp-side-btn"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Share on WhatsApp
                  </Button>
                  {remainingBalance > 0 && !["paid", "cancelled"].includes(bill.status) && (
                    <Button
                      className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                      size="sm"
                      variant="outline"
                      onClick={handleSendReminder}
                      data-testid="bill-send-reminder-btn"
                    >
                      <BellRing className="h-4 w-4" />
                      Send Payment Reminder
                    </Button>
                  )}
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Coming soon"
                  >
                    <FileEdit className="h-4 w-4" />
                    Edit Invoice
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Coming soon"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate Invoice
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Coming soon"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative ml-2 border-l border-border">
                  {/* Invoice Created */}
                  <li className="mb-6 ml-5">
                    <div className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      Invoice Created
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bill.bill_number} · {fmtDateTime(bill.created_at)}
                    </p>
                  </li>

                  {/* Payments received */}
                  {payments.map((p) => (
                    <li key={p.id} className="mb-6 ml-5">
                      <div className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-background">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        Payment Received
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtINR(p.amount)} via{" "}
                        {fmtPaymentMethod(p.payment_method)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(p.payment_date)}
                      </p>
                    </li>
                  ))}

                  {/* Last Updated (only if different from created) */}
                  {bill.updated_at &&
                    bill.updated_at !== bill.created_at && (
                      <li className="ml-5">
                        <div className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/40 ring-4 ring-background">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          Last Updated
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDateTime(bill.updated_at)}
                        </p>
                      </li>
                    )}
                </ol>
              </CardContent>
            </Card>
          </div>
          {/* end right sidebar */}
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        billId={bill.id}
        customerId={bill.customer_id}
        billNumber={bill.bill_number}
        remaining={remainingBalance}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
      />
    </>
  );
}
