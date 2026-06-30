import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Search,
  UserPlus,
  X,
  User,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import Header from "@/components/layout/Header";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useProductSearch,
  useCustomerSearch,
  useCreateBill,
  useQuickCreateCustomer,
  calcRow,
  round2,
  type LineItem,
  type ProductWithStock,
  type CustomerSummary,
} from "@/hooks/useBills";

// ─── Constants ────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function makeEmptyRow(): LineItem {
  return {
    _id: crypto.randomUUID(),
    product_id: "",
    product_name: "",
    brand: null,
    shade_number: null,
    pack_size: null,
    quantity: 1,
    unit_price: 0,
    discount_pct: 0,
    gst_rate: 18,
    gst_amount: 0,
    line_total: 0,
    stock_available: 0,
    room_area: null,
    house_mapping_id: null,
  };
}

// ─── CustomerPicker ───────────────────────────────────────────

interface CustomerPickerProps {
  value: CustomerSummary | null;
  onChange: (c: CustomerSummary | null) => void;
  error?: string;
}

function CustomerPicker({ value, onChange, error }: CustomerPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dSearch = useDebounce(search, 250);
  const { data: results } = useCustomerSearch(dSearch);

  // Quick-create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const quickCreate = useQuickCreateCustomer();

  const handleSelect = (c: CustomerSummary) => {
    onChange(c);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setNewName("");
    setNewPhone("");
    setNameErr("");
    setPhoneErr("");
  };

  const handleQuickCreate = async () => {
    let ok = true;
    if (!newName.trim()) {
      setNameErr("Name is required");
      ok = false;
    }
    if (!/^[6-9]\d{9}$/.test(newPhone.trim())) {
      setPhoneErr("Enter a valid 10-digit Indian mobile number");
      ok = false;
    }
    if (!ok) return;

    try {
      const customer = await quickCreate.mutateAsync({
        name: newName.trim(),
        phone: newPhone.trim(),
      });
      onChange(customer);
      handleModalClose();
      toast.success("Customer added");
    } catch {
      // error handled by mutation
    }
  };

  // ── Selected state ──
  if (value) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
          error ? "border-destructive" : "border-border"
        } bg-muted/20`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{value.name}</p>
          {value.phone && (
            <p className="text-xs text-muted-foreground mt-0.5">{value.phone}</p>
          )}
          {value.city && (
            <p className="text-xs text-muted-foreground">{value.city}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ── Search state ──
  return (
    <>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or mobile…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              className={`pl-9 ${error ? "border-destructive" : ""}`}
            />
            {open && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
                {!results || results.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {search ? "No customers found" : "Type to search customers"}
                  </div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex items-center gap-3"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(c)}
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium flex-1">{c.name}</span>
                      {c.phone && (
                        <span className="text-muted-foreground text-xs ml-2">
                          {c.phone}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 h-10"
            onClick={() => setModalOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Quick-create customer modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) handleModalClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Add New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Rajesh Gupta"
                value={newName}
                autoFocus
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNameErr("");
                }}
                className={nameErr ? "border-destructive" : ""}
              />
              {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="10-digit mobile"
                maxLength={10}
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setPhoneErr("");
                }}
                className={phoneErr ? "border-destructive" : ""}
              />
              {phoneErr && <p className="text-xs text-destructive">{phoneErr}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button onClick={handleQuickCreate} disabled={quickCreate.isPending}>
              {quickCreate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Add Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── ProductCell (combobox per row) ──────────────────────────

interface ProductCellProps {
  displayName: string;
  onSelect: (p: ProductWithStock) => void;
  hasError: boolean;
}

function ProductCell({ displayName, onSelect, hasError }: ProductCellProps) {
  const [search, setSearch] = useState(displayName);
  const [open, setOpen] = useState(false);
  const dSearch = useDebounce(search, 250);
  const { data: products } = useProductSearch(dSearch);

  // Keep local search in sync when parent resets/changes
  React.useEffect(() => {
    setSearch(displayName);
  }, [displayName]);

  return (
    <div className="relative min-w-[180px]">
      <Input
        placeholder="Search product…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className={`h-8 text-sm ${hasError ? "border-destructive" : ""}`}
      />
      {open && (
        <div className="absolute top-full left-0 z-50 mt-0.5 w-80 rounded-lg border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {!products || products.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              {search ? "No products found" : "Type to search products"}
            </div>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-start gap-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p);
                  setSearch(p.name);
                  setOpen(false);
                }}
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[p.brand, p.shade_number, p.pack_size]
                      .filter(Boolean)
                      .join(" · ") || p.sku}
                  </p>
                </div>
                <span
                  className={`text-xs shrink-0 ml-1 font-medium ${
                    p.stock <= 0
                      ? "text-destructive"
                      : p.stock <= 5
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.stock} {p.unit}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── NumInput (compact table cell) ───────────────────────────

interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hasError?: boolean;
  onTabLast?: () => void;
}

function NumInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  hasError,
  onTabLast,
}: NumInputProps) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value === 0 ? "" : String(value)}
      placeholder="0"
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(isNaN(v) ? 0 : v);
      }}
      onKeyDown={
        onTabLast
          ? (e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                onTabLast();
              }
            }
          : undefined
      }
      className={`h-8 text-sm text-right tabular-nums ${hasError ? "border-destructive" : ""}`}
    />
  );
}

// ─── LineItemRow ──────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem;
  index: number;
  isLast: boolean;
  errors: Record<string, string>;
  onChange: (id: string, patch: Partial<LineItem>) => void;
  onDelete: (id: string) => void;
  onAddRow: () => void;
}

function LineItemRow({
  item,
  index,
  isLast,
  errors,
  onChange,
  onDelete,
  onAddRow,
}: LineItemRowProps) {
  const prefix = `item-${item._id}`;

  // Generic field update with recalculation
  const update = useCallback(
    (patch: Partial<LineItem>) => {
      const merged = { ...item, ...patch };
      onChange(item._id, calcRow(merged));
    },
    [item, onChange]
  );

  const handleProductSelect = useCallback(
    (p: ProductWithStock) => {
      const merged: LineItem = {
        ...item,
        product_id: p.id,
        product_name: p.name,
        brand: p.brand,
        shade_number: p.shade_number,
        pack_size: p.pack_size,
        unit_price: p.price,
        stock_available: p.stock,
      };
      onChange(item._id, calcRow(merged));
    },
    [item, onChange]
  );

  const stockExceeded =
    item.product_id && item.quantity > 0 && item.quantity > item.stock_available;

  return (
    <tr className="group border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      {/* Row # */}
      <td className="px-3 py-2 text-center text-xs text-muted-foreground w-8 tabular-nums">
        {index + 1}
      </td>

      {/* Product search */}
      <td className="px-2 py-2">
        <ProductCell
          displayName={item.product_name}
          onSelect={handleProductSelect}
          hasError={!!errors[`${prefix}-product`]}
        />
        {errors[`${prefix}-product`] && (
          <p className="text-xs text-destructive mt-0.5">
            {errors[`${prefix}-product`]}
          </p>
        )}
        {item.product_id && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
            {[item.brand, item.shade_number, item.pack_size]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        )}
        {item.product_id && (
          <p className="text-xs text-muted-foreground">
            Stock:{" "}
            <span
              className={
                stockExceeded
                  ? "text-destructive font-medium"
                  : item.stock_available <= 5
                  ? "text-amber-600 font-medium"
                  : ""
              }
            >
              {item.stock_available}
            </span>
          </p>
        )}
      </td>

      {/* Quantity */}
      <td className="px-2 py-2 w-24">
        <NumInput
          value={item.quantity}
          onChange={(v) => update({ quantity: v })}
          min={0.001}
          step={0.001}
          hasError={!!stockExceeded || !!errors[`${prefix}-qty`]}
        />
        {stockExceeded && (
          <p className="text-xs text-destructive mt-0.5">
            Max {item.stock_available}
          </p>
        )}
        {errors[`${prefix}-qty`] && !stockExceeded && (
          <p className="text-xs text-destructive mt-0.5">
            {errors[`${prefix}-qty`]}
          </p>
        )}
      </td>

      {/* Unit Price */}
      <td className="px-2 py-2 w-28">
        <NumInput
          value={item.unit_price}
          onChange={(v) => update({ unit_price: v })}
          min={0}
          step={0.01}
        />
      </td>

      {/* Discount % */}
      <td className="px-2 py-2 w-24">
        <NumInput
          value={item.discount_pct}
          onChange={(v) =>
            update({ discount_pct: Math.min(100, Math.max(0, v)) })
          }
          min={0}
          max={100}
          step={0.1}
        />
      </td>

      {/* GST % — Tab on last field of last row adds new row */}
      <td className="px-2 py-2 w-24">
        <NumInput
          value={item.gst_rate}
          onChange={(v) =>
            update({ gst_rate: Math.min(100, Math.max(0, v)) })
          }
          min={0}
          max={100}
          step={0.5}
          onTabLast={isLast ? onAddRow : undefined}
        />
      </td>

      {/* GST Amount (read-only) */}
      <td className="px-3 py-2 text-right text-sm text-muted-foreground w-28 tabular-nums">
        {fmtINR(item.gst_amount)}
      </td>

      {/* Line Total (read-only) */}
      <td className="px-3 py-2 text-right text-sm font-semibold w-32 tabular-nums">
        {fmtINR(item.line_total)}
      </td>

      {/* Delete row */}
      <td className="px-2 py-2 w-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
          onClick={() => onDelete(item._id)}
          tabIndex={-1}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─── BillCreate (main page) ───────────────────────────────────

export default function BillCreate() {
  const navigate = useNavigate();
  const createBill = useCreateBill();

  // Header fields
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Line items
  const [rows, setRows] = useState<LineItem[]>([makeEmptyRow()]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Computed totals ──
  const subtotal = round2(
    rows.reduce((s, r) => s + r.quantity * r.unit_price, 0)
  );
  const discountTotal = round2(
    rows.reduce(
      (s, r) =>
        s + round2(r.quantity * r.unit_price * (r.discount_pct / 100)),
      0
    )
  );
  const taxTotal = round2(rows.reduce((s, r) => s + r.gst_amount, 0));
  const grandTotal = round2(rows.reduce((s, r) => s + r.line_total, 0));

  // Clamp paid amount to grand total whenever items change
  const effectivePaid = Math.min(Math.max(0, paidAmount), grandTotal);
  const remainingBalance = round2(Math.max(grandTotal - effectivePaid, 0));

  // Derived status label shown to user
  const derivedStatus =
    grandTotal > 0 && effectivePaid >= grandTotal
      ? "Paid"
      : effectivePaid > 0
      ? "Partially Paid"
      : "Unpaid";

  // ── Row operations ──
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeEmptyRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r._id !== id) : prev
    );
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<LineItem>) => {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, ...patch } : r))
    );
  }, []);

  // ── Validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customer) errs.customer = "Please select or create a customer";
    if (!invoiceDate) errs.date = "Invoice date is required";
    if (rows.every((r) => !r.product_id))
      errs.items = "Add at least one item";

    if (paidAmount < 0)
      errs.paid_amount = "Paid amount cannot be negative";
    if (paidAmount > grandTotal && grandTotal > 0)
      errs.paid_amount = `Paid amount cannot exceed Grand Total (${fmtINR(grandTotal)})`;

    rows.forEach((r) => {
      const prefix = `item-${r._id}`;
      if (!r.product_id) {
        errs[`${prefix}-product`] = "Select a product";
      } else {
        if (r.quantity <= 0)
          errs[`${prefix}-qty`] = "Quantity must be greater than 0";
        if (r.quantity > r.stock_available)
          errs[`${prefix}-qty`] = `Exceeds available stock (${r.stock_available})`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted errors before saving");
      return;
    }
    if (!customer) return;

    try {
      await createBill.mutateAsync({
        customer_id:    customer.id,
        date:           invoiceDate,
        due_date:       dueDate || null,
        payment_method: paymentMethod,
        notes:          notes.trim() || null,
        paid_amount:    effectivePaid,
        items:          rows,
      });
      navigate("/bills");
    } catch {
      // error handled by mutation onError
    }
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <Header
        title="New Invoice"
        subtitle="Create a new customer invoice"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bills">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createBill.isPending}
              className="gap-1.5"
            >
              {createBill.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Invoice
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Customer + Invoice Details ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer picker */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Customer <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerPicker
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  if (errors.customer) {
                    setErrors((prev) => {
                      const { customer: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                error={errors.customer}
              />
            </CardContent>
          </Card>

          {/* Invoice details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Invoice Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`h-9 text-sm ${errors.date ? "border-destructive" : ""}`}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Due Date{" "}
                  <span className="font-normal">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  {derivedStatus}
                  <span className="ml-1 text-xs">(auto)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Notes ── */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Invoice Notes{" "}
                <span className="font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Any notes or terms for this invoice…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Line Items ── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold">
                Invoice Items
              </CardTitle>
              {errors.items && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.items}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="gap-1.5 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-center w-8">#</th>
                  <th className="px-2 py-2.5 text-left">Product</th>
                  <th className="px-2 py-2.5 w-24 text-right">Qty</th>
                  <th className="px-2 py-2.5 w-28 text-right">Unit Price</th>
                  <th className="px-2 py-2.5 w-24 text-right">Disc %</th>
                  <th className="px-2 py-2.5 w-24 text-right">GST %</th>
                  <th className="px-3 py-2.5 w-28 text-right">GST Amt</th>
                  <th className="px-3 py-2.5 w-32 text-right">Line Total</th>
                  <th className="px-2 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <LineItemRow
                    key={row._id}
                    item={row}
                    index={index}
                    isLast={index === rows.length - 1}
                    errors={errors}
                    onChange={updateRow}
                    onDelete={removeRow}
                    onAddRow={addRow}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals panel ── */}
          <div className="border-t border-border bg-muted/20 px-6 py-4">
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              {/* Bill totals */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{fmtINR(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600 tabular-nums">
                    −{fmtINR(discountTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="font-medium tabular-nums">{fmtINR(taxTotal)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2.5 text-base font-bold">
                <span>Grand Total</span>
                <span className="text-primary tabular-nums">{fmtINR(grandTotal)}</span>
              </div>

              {/* ── Payment section ── */}
              <div className="border-t border-border pt-3 space-y-3">
                {/* Paid Amount input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Paid Amount
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={grandTotal}
                      step={0.01}
                      value={paidAmount === 0 ? "" : String(paidAmount)}
                      placeholder="0.00"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setPaidAmount(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      className={`h-8 text-sm text-right tabular-nums w-40 ${
                        errors.paid_amount ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.paid_amount && (
                    <p className="text-xs text-destructive text-right">
                      {errors.paid_amount}
                    </p>
                  )}
                </div>

                {/* Remaining Balance */}
                <div className="flex justify-between items-center">
                  <span
                    className={
                      remainingBalance > 0
                        ? "text-amber-600 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    Remaining Balance
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      remainingBalance > 0 ? "text-amber-600" : "text-green-600"
                    }`}
                  >
                    {fmtINR(remainingBalance)}
                  </span>
                </div>

                {/* Derived status pill */}
                <div className="flex justify-end">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      derivedStatus === "Paid"
                        ? "bg-green-100 text-green-700"
                        : derivedStatus === "Partially Paid"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Status: {derivedStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Bottom action bar ── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button variant="outline" asChild>
            <Link to="/bills">Cancel</Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={createBill.isPending}
            className="gap-2 min-w-[140px]"
          >
            {createBill.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Invoice
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
