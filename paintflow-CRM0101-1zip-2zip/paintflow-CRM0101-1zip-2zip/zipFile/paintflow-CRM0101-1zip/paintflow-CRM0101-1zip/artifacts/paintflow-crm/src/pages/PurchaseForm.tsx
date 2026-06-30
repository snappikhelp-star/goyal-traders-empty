import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  useCreatePurchase, useUpdatePurchase, usePurchase,
  type PurchaseItem, type PurchaseStatus, type PaymentMethod,
} from "@/hooks/usePurchases";

// ── Types ─────────────────────────────────────────────────────

interface LineItem {
  product_id:       string;
  product_name:     string;
  quantity:         number;
  purchase_price:   number;
  gst_percent:      number;
  discount_percent: number;
  line_total:       number;
}

interface ProductOption {
  id: string; name: string; sku: string; purchase_price: number; gst_rate: number; unit: string;
}

interface CompanyOption {
  id: string; name: string;
}

// ── Helpers ───────────────────────────────────────────────────

function calcLineTotal(qty: number, price: number, gst: number, disc: number): number {
  const base = qty * price;
  const afterDisc = base * (1 - disc / 100);
  return afterDisc * (1 + gst / 100);
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().split("T")[0];

const emptyLine = (): LineItem => ({
  product_id: "", product_name: "", quantity: 1,
  purchase_price: 0, gst_percent: 0, discount_percent: 0, line_total: 0,
});

// ── Combobox-style product selector ──────────────────────────

function ProductCell({
  item, idx, products, onChange,
}: {
  item: LineItem; idx: number; products: ProductOption[];
  onChange: (idx: number, partial: Partial<LineItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState(item.product_name);

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()),
  );

  const select = (p: ProductOption) => {
    onChange(idx, {
      product_id:     p.id,
      product_name:   p.name,
      purchase_price: p.purchase_price,
      gst_percent:    p.gst_rate,
      line_total:     calcLineTotal(item.quantity, p.purchase_price, p.gst_rate, item.discount_percent),
    });
    setQ(p.name);
    setOpen(false);
  };

  return (
    <div className="relative min-w-[200px]">
      <div className="flex items-center">
        <Input
          value={q}
          placeholder="Search product…"
          className="text-sm h-8 pr-6"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-9 left-0 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 20).map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => select(p)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.sku} · {p.unit} · ₹{p.purchase_price}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────

export default function PurchaseForm() {
  const navigate    = useNavigate();
  const { id }      = useParams<{ id: string }>();
  const isEdit      = !!id;

  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();

  const { data: existing, isLoading: loadingExisting } = usePurchase(id ?? "");

  // ── Remote data ───────────────────────────────────────────

  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ["companies-list"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("companies").select("id, name").eq("status", "active").order("name");
      return (data ?? []) as CompanyOption[];
    },
  });

  const { data: products = [] } = useQuery<ProductOption[]>({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, purchase_price, gst_rate, unit")
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as ProductOption[];
    },
  });

  // ── Form state ────────────────────────────────────────────

  const [companyId,     setCompanyId]     = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate,   setInvoiceDate]   = useState(today());
  const [dueDate,       setDueDate]       = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [status,        setStatus]        = useState<PurchaseStatus>("due");
  const [paidAmount,    setPaidAmount]    = useState(0);
  const [notes,         setNotes]         = useState("");
  const [items,         setItems]         = useState<LineItem[]>([emptyLine()]);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [submitting,    setSubmitting]    = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!existing) return;
    setCompanyId(existing.company_id ?? "");
    setInvoiceNumber(existing.invoice_number);
    setInvoiceDate(existing.invoice_date);
    setDueDate(existing.due_date ?? "");
    setPaymentMethod(existing.payment_method);
    setStatus(existing.status);
    setPaidAmount(existing.paid_amount);
    setNotes(existing.notes ?? "");
    if (existing.purchase_items?.length) {
      setItems(existing.purchase_items.map((it) => ({
        product_id:       it.product_id ?? "",
        product_name:     it.product_name,
        quantity:         it.quantity,
        purchase_price:   it.purchase_price,
        gst_percent:      it.gst_percent,
        discount_percent: it.discount_percent,
        line_total:       it.line_total,
      })));
    }
  }, [existing]);

  // ── Totals ────────────────────────────────────────────────

  const subtotal = items.reduce((s, it) => {
    const base = it.quantity * it.purchase_price;
    return s + base * (1 - it.discount_percent / 100);
  }, 0);

  const gstAmount = items.reduce((s, it) => {
    const base = it.quantity * it.purchase_price * (1 - it.discount_percent / 100);
    return s + base * (it.gst_percent / 100);
  }, 0);

  const grandTotal  = subtotal + gstAmount;
  const dueAmount   = Math.max(0, grandTotal - paidAmount);

  // Auto-set status based on amounts
  const derivedStatus: PurchaseStatus =
    paidAmount <= 0 ? "due" :
    paidAmount >= grandTotal ? "paid" :
    "partial";

  // ── Line item handlers ────────────────────────────────────

  const updateItem = useCallback((idx: number, partial: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...partial };
      next.line_total = calcLineTotal(
        next.quantity, next.purchase_price, next.gst_percent, next.discount_percent,
      );
      return next;
    }));
  }, []);

  const addLine  = () => setItems((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Validation ────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!invoiceNumber.trim()) e.invoiceNumber = "Invoice number is required";
    if (!invoiceDate)           e.invoiceDate   = "Invoice date is required";
    const validItems = items.filter((it) => it.product_name.trim());
    if (!validItems.length)     e.items         = "Add at least one product";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const validItems = items.filter((it) => it.product_name.trim());

    const purchasePayload = {
      company_id:     companyId || null,
      invoice_number: invoiceNumber.trim(),
      invoice_date:   invoiceDate,
      due_date:       dueDate || null,
      payment_method: paymentMethod,
      status:         derivedStatus,
      subtotal,
      gst_amount:     gstAmount,
      grand_total:    grandTotal,
      paid_amount:    paidAmount,
      due_amount:     dueAmount,
      notes:          notes.trim() || null,
    };

    const itemsPayload: Omit<PurchaseItem, "id" | "purchase_id">[] = validItems.map((it) => ({
      product_id:       it.product_id || null,
      product_name:     it.product_name,
      quantity:         it.quantity,
      purchase_price:   it.purchase_price,
      gst_percent:      it.gst_percent,
      discount_percent: it.discount_percent,
      line_total:       it.line_total,
    }));

    try {
      if (isEdit && id) {
        await updatePurchase.mutateAsync({
          id,
          purchase:  purchasePayload,
          items:     itemsPayload,
          oldItems:  existing?.purchase_items ?? [],
        });
      } else {
        await createPurchase.mutateAsync({ purchase: purchasePayload, items: itemsPayload });
      }
      navigate("/purchases");
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex flex-col h-full">
        <Header title={isEdit ? "Edit Purchase" : "New Purchase"} subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={isEdit ? "Edit Purchase" : "New Purchase"}
        subtitle={isEdit ? `Editing ${existing?.invoice_number ?? ""}` : "Record a supplier purchase"}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">

          {/* ── Header fields ─────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Company + Invoice Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Select value={companyId || "_none"} onValueChange={(v) => setCompanyId(v === "_none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="_none">— No company —</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Invoice Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2025-001"
                  />
                  {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber}</p>}
                </div>
              </div>

              {/* Row 2: Invoice Date + Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Invoice Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date" value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                  {errors.invoiceDate && <p className="text-xs text-destructive">{errors.invoiceDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              {/* Row 3: Payment Method + Status indicator */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Status</Label>
                  <div className="flex items-center h-9 mt-0.5 gap-2">
                    <Badge
                      variant="outline"
                      className={`text-sm px-3 py-1 ${
                        derivedStatus === "paid"    ? "bg-green-100 text-green-700 border-green-200" :
                        derivedStatus === "partial" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                     "bg-red-100 text-red-700 border-red-200"
                      }`}
                    >
                      {derivedStatus === "paid" ? "Paid" : derivedStatus === "partial" ? "Partial" : "Due"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Auto-calculated from paid amount</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
              </div>
            </CardContent>
          </Card>

          {/* ── Products ──────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Products</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {errors.items && (
                <p className="text-xs text-destructive px-6 pb-3">{errors.items}</p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold min-w-[200px]">Product</TableHead>
                      <TableHead className="font-semibold w-24">Qty</TableHead>
                      <TableHead className="font-semibold w-32">Purchase Price</TableHead>
                      <TableHead className="font-semibold w-24">GST %</TableHead>
                      <TableHead className="font-semibold w-24">Discount %</TableHead>
                      <TableHead className="font-semibold w-32 text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-2">
                          <ProductCell
                            item={item} idx={idx}
                            products={products}
                            onChange={updateItem}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number" min={0.001} step={0.001}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20 text-sm"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number" min={0} step={0.01}
                            value={item.purchase_price}
                            onChange={(e) => updateItem(idx, { purchase_price: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-28 text-sm"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number" min={0} max={100} step={0.5}
                            value={item.gst_percent}
                            onChange={(e) => updateItem(idx, { gst_percent: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20 text-sm"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number" min={0} max={100} step={0.5}
                            value={item.discount_percent}
                            onChange={(e) => updateItem(idx, { discount_percent: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20 text-sm"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right font-medium text-sm">
                          {fmtCurrency(item.line_total)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(idx)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ── Summary ───────────────────────────────── */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmtCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">GST</span>
                  <span className="font-medium">{fmtCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between w-64 border-t pt-2 text-base font-bold">
                  <span>Grand Total</span>
                  <span>{fmtCurrency(grandTotal)}</span>
                </div>

                <div className="flex justify-between w-64 mt-2 items-center">
                  <Label className="text-muted-foreground font-normal">Paid Amount</Label>
                  <Input
                    type="number" min={0} step={0.01}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="h-8 w-32 text-sm text-right"
                  />
                </div>
                <div className={`flex justify-between w-64 font-semibold ${dueAmount > 0 ? "text-destructive" : "text-green-700"}`}>
                  <span>Due Amount</span>
                  <span>{fmtCurrency(dueAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Actions ───────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/purchases")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Save Purchase"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
