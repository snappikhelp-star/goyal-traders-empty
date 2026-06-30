import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Edit, Building2, Calendar, CreditCard,
  FileText, Package, Plus, Trash2, IndianRupee, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Header from "@/components/layout/Header";
import {
  usePurchase, usePurchasePayments, useAddPurchasePayment, useDeletePurchasePayment,
  type PaymentMethod, type PurchasePayment,
} from "@/hooks/usePurchases";

// ── Constants ─────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
  paid:    "bg-green-100 text-green-700 border-green-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  due:     "bg-red-100   text-red-700   border-red-200",
};
const STATUS_LABEL: Record<string, string> = { paid: "Paid", partial: "Partial", due: "Due" };
const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", upi: "UPI", cheque: "Cheque", bank_transfer: "Bank Transfer",
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtDateShort = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const today = () => new Date().toISOString().split("T")[0];

// ── Record Payment Dialog ─────────────────────────────────────

function RecordPaymentDialog({
  open, onClose, purchaseId, companyId, dueAmount,
}: {
  open:       boolean;
  onClose:    () => void;
  purchaseId: string;
  companyId:  string | null;
  dueAmount:  number;
}) {
  const addPayment = useAddPurchasePayment();
  const [date,   setDate]   = useState(today());
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<number>(dueAmount > 0 ? dueAmount : 0);
  const [ref,    setRef]    = useState("");
  const [notes,  setNotes]  = useState("");
  const [err,    setErr]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) { setErr("Amount must be greater than zero"); return; }
    if (!date)                   { setErr("Payment date is required"); return; }
    setErr("");

    await addPayment.mutateAsync({
      purchase_id:    purchaseId,
      company_id:     companyId,
      payment_date:   date,
      payment_method: method,
      amount,
      reference:      ref.trim() || null,
      notes:          notes.trim() || null,
    });
    onClose();
  };

  const handleClose = () => {
    setDate(today()); setMethod("cash");
    setAmount(dueAmount > 0 ? dueAmount : 0);
    setRef(""); setNotes(""); setErr("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Payment Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Amount (₹) <span className="text-destructive">*</span>
              {dueAmount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  Outstanding: {fmtCurrency(dueAmount)}
                </span>
              )}
            </Label>
            <Input
              type="number" min={0.01} step={0.01}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reference No. (optional)</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="UTR / cheque no. / transaction ID"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment History ───────────────────────────────────────────

function PaymentHistory({
  purchaseId, companyId,
}: {
  purchaseId: string; companyId: string | null;
}) {
  const { data: payments, isLoading } = usePurchasePayments(purchaseId);
  const deletePayment = useDeletePurchasePayment();
  const [delTarget, setDelTarget] = useState<PurchasePayment | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : !payments?.length ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold">Reference</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm">{fmtDateShort(p.payment_date)}</TableCell>
                    <TableCell className="text-sm">{METHOD_LABEL[p.payment_method] ?? p.payment_method}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-700">
                      {fmtCurrency(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDelTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment of {delTarget ? fmtCurrency(delTarget.amount) : ""}
              {" "}and recalculate the purchase balance. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (delTarget) {
                  deletePayment.mutate(
                    { id: delTarget.id, purchaseId, companyId },
                    { onSuccess: () => setDelTarget(null) },
                  );
                }
              }}
            >
              {deletePayment.isPending ? "Deleting…" : "Delete Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main view ─────────────────────────────────────────────────

export default function PurchaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading } = usePurchase(id ?? "");
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Purchase Details" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Purchase Not Found" subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">This purchase record could not be found.</p>
            <Button variant="outline" onClick={() => navigate("/purchases")}>← Back to Purchases</Button>
          </div>
        </div>
      </div>
    );
  }

  const items = purchase.purchase_items ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Purchase — ${purchase.invoice_number}`}
        subtitle={purchase.company?.name ?? "No company"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/purchases")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {purchase.status !== "paid" && (
              <Button
                variant="outline" size="sm"
                className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => setPaymentOpen(true)}
              >
                <IndianRupee className="h-4 w-4" /> Record Payment
              </Button>
            )}
            <Button size="sm" asChild className="gap-1.5">
              <Link to={`/purchases/${purchase.id}/edit`}>
                <Edit className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl mx-auto w-full">

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">Invoice</span>
              </div>
              <p className="font-mono font-semibold">{purchase.invoice_number}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">Company</span>
              </div>
              <p className="font-semibold truncate">{purchase.company?.name ?? "—"}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">Date</span>
              </div>
              <p className="font-semibold">{fmtDate(purchase.invoice_date)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">Payment</span>
              </div>
              <p className="font-semibold">{METHOD_LABEL[purchase.payment_method] ?? purchase.payment_method}</p>
            </CardContent>
          </Card>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold ${STATUS_CLASS[purchase.status] ?? ""}`}>
            {STATUS_LABEL[purchase.status] ?? purchase.status}
          </span>
          {purchase.due_date && (
            <span className="text-sm text-muted-foreground">
              Due by {fmtDate(purchase.due_date)}
            </span>
          )}
          {purchase.status !== "paid" && (
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 ml-auto"
              onClick={() => setPaymentOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Record Payment
            </Button>
          )}
        </div>

        {/* Line items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Products ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold text-right w-20">Qty</TableHead>
                  <TableHead className="font-semibold text-right w-32">Price</TableHead>
                  <TableHead className="font-semibold text-right w-20">GST%</TableHead>
                  <TableHead className="font-semibold text-right w-24">Disc%</TableHead>
                  <TableHead className="font-semibold text-right w-32">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No items recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, i) => (
                    <TableRow key={it.id ?? i}>
                      <TableCell className="font-medium">{it.product_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCurrency(it.purchase_price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.gst_percent}%</TableCell>
                      <TableCell className="text-right tabular-nums">{it.discount_percent}%</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{fmtCurrency(it.line_total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{fmtCurrency(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">GST</span>
                <span className="font-medium">{fmtCurrency(purchase.gst_amount)}</span>
              </div>
              <div className="flex justify-between w-64 border-t pt-2 text-base font-bold">
                <span>Grand Total</span>
                <span>{fmtCurrency(purchase.grand_total)}</span>
              </div>
              <div className="flex justify-between w-64 text-green-700 font-semibold">
                <span>Paid</span>
                <span>{fmtCurrency(purchase.paid_amount)}</span>
              </div>
              <div className={`flex justify-between w-64 font-semibold ${purchase.due_amount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                <span>Due</span>
                <span>{fmtCurrency(purchase.due_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <PaymentHistory purchaseId={purchase.id} companyId={purchase.company_id} />

        {/* Notes */}
        {purchase.notes && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm whitespace-pre-line">{purchase.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        purchaseId={purchase.id}
        companyId={purchase.company_id}
        dueAmount={purchase.due_amount}
      />
    </div>
  );
}
