import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, Package, MoreHorizontal, Filter,
  Copy, PowerOff, Power, Pencil, X, ChevronLeft, ChevronRight,
  Camera, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/layout/Header";
import {
  useProducts, useProductFilterOptions, useCreateProduct, useUpdateProduct,
  useDuplicateProduct, useSetProductActive,
  PAINT_CATEGORIES, FINISH_TYPES, PACK_SIZES, GST_RATES, UNITS,
  EMPTY_PRODUCT_FORM, generateSku, PAGE_SIZE,
  type ProductFormValues, type ProductWithStock,
} from "@/hooks/useProducts";
import type { Product } from "@/types";
import { extractProductFromPhoto } from "@/lib/ocr";

// ─── Currency formatter ───────────────────────────────────────
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
const fmtINR = (n: number) => INR.format(n);

// ─── Stock status helper ──────────────────────────────────────
function StockBadge({ qty, min }: { qty: number; min: number }) {
  if (qty === 0)
    return <span className="text-xs font-medium text-red-600">Out</span>;
  if (qty <= min)
    return <span className="text-xs font-medium text-amber-600">{qty} ⚠</span>;
  return <span className="text-xs text-muted-foreground tabular-nums">{qty}</span>;
}

// ─── Product form dialog ──────────────────────────────────────
interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: ProductWithStock | null;
}

function ProductFormDialog({ open, onClose, initial }: ProductFormDialogProps) {
  const isEdit = !!initial;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const fields = await extractProductFromPhoto(file, setOcrProgress);
      setForm((prev) => ({
        ...prev,
        ...(fields.name        ? { name:         fields.name }        : {}),
        ...(fields.brand       ? { brand:         fields.brand }       : {}),
        ...(fields.shade_number ? { shade_number: fields.shade_number } : {}),
        ...(fields.shade_name  ? { shade_name:    fields.shade_name }  : {}),
        ...(fields.pack_size   ? { pack_size:     fields.pack_size }   : {}),
        ...(fields.barcode     ? { barcode:        fields.barcode }     : {}),
      }));
    } catch {
      // silently ignore OCR errors — user can fill manually
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
    }
  };

  // Populate form when opening in edit mode
  useEffect(() => {
    if (open) {
      if (initial) {
        const p = initial as Product & {
          shade_name?: string; finish?: string;
          purchase_price?: number; gst_rate?: number; is_active?: boolean;
        };
        setForm({
          name:           p.name,
          sku:            p.sku,
          brand:          p.brand ?? "",
          category:       p.category,
          shade_number:   p.shade_number ?? "",
          shade_name:     p.shade_name ?? "",
          finish:         p.finish ?? "",
          pack_size:      p.pack_size ?? "",
          barcode:        p.barcode ?? "",
          unit:           p.unit,
          hsn_code:       p.hsn_code ?? "",
          gst_rate:       p.gst_rate ?? 18,
          purchase_price: p.purchase_price ?? 0,
          price:          p.price,
          description:    p.description ?? "",
          is_active:      p.is_active ?? true,
        });
      } else {
        setForm(EMPTY_PRODUCT_FORM);
      }
      setErrors({});
    }
  }, [open, initial]);

  const set = <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.category) e.category = "Required";
    if (form.price < 0) e.price = "Must be ≥ 0";
    if (form.purchase_price < 0) e.purchase_price = "Must be ≥ 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!form.sku.trim()) set("sku", generateSku(form.name, form.brand));
    const values: ProductFormValues = {
      ...form,
      sku: form.sku.trim() || generateSku(form.name, form.brand),
    };
    if (isEdit && initial) {
      await updateProduct.mutateAsync({ id: initial.id, values });
    } else {
      await createProduct.mutateAsync(values);
    }
    onClose();
  };

  const busy = createProduct.isPending || updateProduct.isPending;

  const field = (
    label: string,
    key: keyof ProductFormValues,
    type: "text" | "number" = "text",
    required = false
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        type={type}
        value={String(form[key])}
        onChange={(e) =>
          set(key, type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value as ProductFormValues[typeof key])
        }
        className={`h-8 text-sm ${errors[key] ? "border-destructive" : ""}`}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoOcr}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                disabled={ocrLoading}
                onClick={() => photoInputRef.current?.click()}
              >
                {ocrLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {ocrProgress > 0 ? `Reading… ${ocrProgress}%` : "Loading OCR…"}
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    Auto Fill from Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-2">
          {/* ── Section 1: Basic Info ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Basic Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("Product Name", "name", "text", true)}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  SKU <span className="text-muted-foreground font-normal">(auto-generated if empty)</span>
                </Label>
                <Input
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  className="h-8 text-sm font-mono"
                  placeholder={generateSku(form.name || "PRD", form.brand || "")}
                />
              </div>
              {field("Brand", "brand")}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Category<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className={`h-8 text-sm ${errors.category ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAINT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
              </div>
            </div>
          </div>

          {/* ── Section 2: Paint Details ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Paint Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("Shade Number", "shade_number")}
              {field("Shade Name", "shade_name")}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Finish</Label>
                <Select value={form.finish} onValueChange={(v) => set("finish", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select finish" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {FINISH_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pack Size</Label>
                <Select value={form.pack_size} onValueChange={(v) => set("pack_size", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {PACK_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section 3: Unit & Barcode ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Identification
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {field("Barcode", "barcode")}
              {field("HSN Code", "hsn_code")}
            </div>
          </div>

          {/* ── Section 4: Pricing & Tax ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Pricing & Tax
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">GST Rate</Label>
                <Select
                  value={String(form.gst_rate)}
                  onValueChange={(v) => set("gst_rate", Number(v))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Purchase Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.purchase_price}
                  onChange={(e) => set("purchase_price", parseFloat(e.target.value) || 0)}
                  className={`h-8 text-sm ${errors.purchase_price ? "border-destructive" : ""}`}
                />
                {errors.purchase_price && <p className="text-xs text-destructive">{errors.purchase_price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Selling Price (₹)<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                  className={`h-8 text-sm ${errors.price ? "border-destructive" : ""}`}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            </div>
          </div>

          {/* ── Section 5: Settings ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Settings
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive products are hidden from billing
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => set("is_active", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Optional product description"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            <X className="h-3.5 w-3.5 mr-1.5" />Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Products page ───────────────────────────────────────

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [isActive, setIsActive] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductWithStock | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductWithStock | null>(null);

  const { data: result, isLoading } = useProducts({
    page, search, category, brand, isActive,
  });
  const { data: filterOpts } = useProductFilterOptions();
  const duplicateProduct = useDuplicateProduct();
  const setActive = useSetProductActive();

  const products = result?.data ?? [];
  const total    = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset page on filter change
  const resetPage = () => setPage(1);

  const openAdd  = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (p: ProductWithStock) => { setEditTarget(p); setFormOpen(true); };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Products"
        subtitle="Manage your paint & supply catalog"
        actions={
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />Add Product
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, SKU, brand, shade, barcode…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="pl-9 h-9"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); resetPage(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={category} onValueChange={(v) => { setCategory(v); resetPage(); }}>
            <SelectTrigger className="h-9 w-44">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(filterOpts?.categories ?? []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={(v) => { setBrand(v); resetPage(); }}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {(filterOpts?.brands ?? []).map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={isActive}
            onValueChange={(v) => { setIsActive(v as typeof isActive); resetPage(); }}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {total > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {total} product{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Brand</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Shade / Finish</TableHead>
                <TableHead className="font-semibold">Pack</TableHead>
                <TableHead className="font-semibold text-right">Price</TableHead>
                <TableHead className="font-semibold text-right">GST</TableHead>
                <TableHead className="font-semibold text-right">Stock</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(11)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {search || category !== "all" || brand !== "all"
                          ? "No products match your filters"
                          : "No products yet — add your first product"}
                      </p>
                      {!search && category === "all" && brand === "all" && (
                        <Button size="sm" className="mt-3 gap-1.5" onClick={openAdd}>
                          <Plus className="h-3.5 w-3.5" />Add Product
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const inv = p.inventory;
                  const qty = inv?.quantity ?? 0;
                  const minQty = inv?.min_quantity ?? 0;
                  const pa = p as Product & { shade_name?: string; finish?: string; is_active?: boolean; gst_rate?: number };
                  return (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openEdit(p)}
                    >
                      <TableCell className="font-medium max-w-[180px]">
                        <span className="truncate block">{p.name}</span>
                        {pa.shade_name && (
                          <span className="text-xs text-muted-foreground">{pa.shade_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.brand ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {p.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{p.shade_number ?? "—"}</div>
                        {pa.finish && <div className="text-xs">{pa.finish}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.pack_size ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-sm">
                        {fmtINR(p.price)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {pa.gst_rate ?? 0}%
                      </TableCell>
                      <TableCell className="text-right">
                        {inv ? (
                          <StockBadge qty={qty} min={minQty} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            pa.is_active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {pa.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateProduct.mutate(p as unknown as Product)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(p as unknown as { is_active?: boolean }).is_active !== false ? (
                              <DropdownMenuItem
                                className="text-amber-600"
                                onClick={() => setDeactivateTarget(p)}
                              >
                                <PowerOff className="h-3.5 w-3.5 mr-2" />Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => setActive.mutate({ id: p.id, is_active: true })}
                              >
                                <Power className="h-3.5 w-3.5 mr-2" />Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <ProductFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editTarget}
      />

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(v) => !v && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deactivateTarget?.name}</strong> will be hidden from billing and
              product searches. You can re-activate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (deactivateTarget) {
                  setActive.mutate({ id: deactivateTarget.id, is_active: false });
                  setDeactivateTarget(null);
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
