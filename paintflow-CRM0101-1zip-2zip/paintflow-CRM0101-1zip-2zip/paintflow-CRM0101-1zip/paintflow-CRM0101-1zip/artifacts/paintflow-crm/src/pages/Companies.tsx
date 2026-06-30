import { useState } from "react";
import {
  Plus, Search, Building2, MoreHorizontal,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Phone, Mail, Edit, Trash2, X, SlidersHorizontal,
  CreditCard, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  type Company, type CompanyInsert, type CompanySortField,
} from "@/hooks/useCompanies";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Zod schema ────────────────────────────────────────────────
const companySchema = z.object({
  name:               z.string().min(1, "Company name is required").max(100),
  brand:              z.enum(["JSW Paints", "Birla Opus", "Other"]).nullable().optional(),
  contact_person:     z.string().max(80).nullable().optional(),
  mobile:             z.string().max(20).nullable().optional(),
  email:              z.string().email("Invalid email").max(100).nullable().optional().or(z.literal("")),
  gstin:              z.string().max(20).nullable().optional(),
  address:            z.string().max(300).nullable().optional(),
  credit_limit:       z.coerce.number().min(0, "Must be ≥ 0").default(0),
  payment_terms_days: z.coerce.number().int().min(0, "Must be ≥ 0").default(30),
  opening_due:        z.coerce.number().default(0),
  notes:              z.string().max(500).nullable().optional(),
  status:             z.enum(["active", "inactive"]).default("active"),
});

type FormValues = z.infer<typeof companySchema>;

const BRANDS = ["JSW Paints", "Birla Opus", "Other"] as const;
const PAGE_SIZE = 15;

// ── Sort header ───────────────────────────────────────────────
function SortHead({
  field, label, sortField, sortAsc, onSort,
}: {
  field: CompanySortField; label: string;
  sortField: CompanySortField; sortAsc: boolean;
  onSort: (f: CompanySortField) => void;
}) {
  const active = sortField === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/40 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5 font-semibold">
        {label}
        {active
          ? sortAsc
            ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
            : <ChevronDown className="h-3.5 w-3.5 text-primary" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-25" />}
      </div>
    </TableHead>
  );
}

// ── Company form dialog ───────────────────────────────────────
function CompanyFormDialog({
  open,
  onClose,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Company | null;
}) {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const isEdit = !!initialData;

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: initialData
      ? {
          name:               initialData.name,
          brand:              initialData.brand ?? undefined,
          contact_person:     initialData.contact_person ?? "",
          mobile:             initialData.mobile ?? "",
          email:              initialData.email ?? "",
          gstin:              initialData.gstin ?? "",
          address:            initialData.address ?? "",
          credit_limit:       initialData.credit_limit,
          payment_terms_days: initialData.payment_terms_days,
          opening_due:        initialData.opening_due,
          notes:              initialData.notes ?? "",
          status:             initialData.status,
        }
      : {
          credit_limit: 0, payment_terms_days: 30, opening_due: 0, status: "active",
        },
  });

  const onSubmit = async (values: FormValues) => {
    const payload: CompanyInsert = {
      name:               values.name,
      brand:              (values.brand as Company["brand"]) ?? null,
      contact_person:     values.contact_person || null,
      mobile:             values.mobile || null,
      email:              values.email || null,
      gstin:              values.gstin || null,
      address:            values.address || null,
      credit_limit:       values.credit_limit,
      payment_terms_days: values.payment_terms_days,
      opening_due:        values.opening_due,
      notes:              values.notes || null,
      status:             values.status,
    };

    if (isEdit && initialData) {
      await updateCompany.mutateAsync({ id: initialData.id, ...payload });
    } else {
      await createCompany.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Row 1: Name + Brand */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" {...register("name")} placeholder="e.g. JSW Paints Ltd." />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "_none"}
                    onValueChange={(v) => field.onChange(v === "_none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— None —</SelectItem>
                      {BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 2: Contact + Mobile */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" {...register("contact_person")} placeholder="e.g. Rajesh Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" {...register("mobile")} placeholder="e.g. 9876500001" />
            </div>
          </div>

          {/* Row 3: Email + GSTIN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="e.g. sales@company.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" {...register("gstin")} placeholder="e.g. 23AABCJ1234A1Z5" className="font-mono" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} placeholder="Full office/warehouse address" rows={2} />
          </div>

          {/* Row 4: Credit Limit + Payment Terms + Opening Due */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
              <Input
                id="credit_limit"
                type="number"
                min={0}
                step={1000}
                {...register("credit_limit")}
                placeholder="0"
              />
              {errors.credit_limit && (
                <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_terms_days">Payment Terms (days)</Label>
              <Input
                id="payment_terms_days"
                type="number"
                min={0}
                {...register("payment_terms_days")}
                placeholder="30"
              />
              {errors.payment_terms_days && (
                <p className="text-xs text-destructive">{errors.payment_terms_days.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opening_due">Opening Due (₹)</Label>
              <Input
                id="opening_due"
                type="number"
                step={0.01}
                {...register("opening_due")}
                placeholder="0"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any additional notes…" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createCompany.isPending || updateCompany.isPending}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Companies() {
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [sortField, setSortField]     = useState<CompanySortField>("name");
  const [sortAsc, setSortAsc]         = useState(true);
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen]       = useState(false);
  const [editTarget, setEditTarget]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const deleteCompany   = useDeleteCompany();

  const { data, isLoading } = useCompanies({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    sortField,
    sortAsc,
    brand:  brandFilter,
    status: statusFilter,
  });

  const companies   = data?.companies ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters  = !!brandFilter || !!statusFilter;

  const handleSort = (field: CompanySortField) => {
    if (sortField === field) setSortAsc((a) => !a);
    else { setSortField(field); setSortAsc(true); }
    setPage(1);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const handleEdit = (c: Company) => { setEditTarget(c); setFormOpen(true); };

  const handleFormClose = () => { setFormOpen(false); setEditTarget(null); };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const brandBadgeColor = (brand: Company["brand"]) => {
    if (brand === "JSW Paints")  return "bg-blue-50 text-blue-700 border-blue-200";
    if (brand === "Birla Opus")  return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Companies"
        subtitle={isLoading ? "Loading…" : `${total} compan${total !== 1 ? "ies" : "y"}`}
        actions={
          <Button size="sm" className="gap-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search + Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, contact, mobile or GSTIN…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters || hasFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {[brandFilter, statusFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex items-center gap-4 flex-wrap rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Brand</span>
              <Select value={brandFilter || "_all"} onValueChange={(v) => { setBrandFilter(v === "_all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Brands</SelectItem>
                  {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</span>
              <Select value={statusFilter || "_all"} onValueChange={(v) => { setStatusFilter(v === "_all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => { setBrandFilter(""); setStatusFilter(""); setPage(1); }}
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortHead field="name"         label="Company"        sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortHead field="brand"         label="Brand"          sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">GSTIN</TableHead>
                <SortHead field="credit_limit"  label="Credit Limit"   sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="font-semibold">Terms</TableHead>
                <SortHead field="status"        label="Status"         sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" style={{ width: j === 0 ? 140 : j === 7 ? 32 : 80 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <Building2 className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {search || hasFilters ? "No companies match your search" : "No companies yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {!search && !hasFilters && "Add your first supplier or brand company to get started"}
                        </p>
                      </div>
                      {!search && !hasFilters && (
                        <Button size="sm" variant="outline" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                          <Plus className="h-4 w-4 mr-1.5" /> Add First Company
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => {
                  const initials = company.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <TableRow key={company.id} className="hover:bg-muted/30 transition-colors">
                      {/* Company */}
                      <TableCell>
                        <Link to={`/companies/${company.id}`} className="flex items-center gap-3 group">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold select-none group-hover:bg-primary/20 transition-colors">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{company.name}</p>
                            {company.address && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {company.address}
                              </p>
                            )}
                          </div>
                        </Link>
                      </TableCell>

                      {/* Brand */}
                      <TableCell>
                        {company.brand ? (
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${brandBadgeColor(company.brand)}`}>
                            {company.brand}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          {company.contact_person && (
                            <p className="text-sm text-foreground">{company.contact_person}</p>
                          )}
                          {company.mobile && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{company.mobile}</span>
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{company.email}</span>
                            </div>
                          )}
                          {!company.contact_person && !company.mobile && !company.email && (
                            <span className="text-muted-foreground/30 text-sm">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* GSTIN */}
                      <TableCell>
                        {company.gstin ? (
                          <span className="font-mono text-xs bg-muted rounded px-2 py-0.5">
                            {company.gstin}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Credit Limit */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {fmtCurrency(company.credit_limit)}
                          </div>
                          {company.opening_due !== 0 && (
                            <p className={`text-xs ${company.opening_due > 0 ? "text-destructive" : "text-green-600"}`}>
                              Due: {fmtCurrency(Math.abs(company.opening_due))}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Terms */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {company.payment_terms_days}d
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={company.status === "active" ? "default" : "secondary"}
                          className="capitalize text-xs"
                        >
                          {company.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link to={`/companies/${company.id}`} className="flex items-center">
                                <Building2 className="h-4 w-4 mr-2" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(company)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(company)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} compan{total !== 1 ? "ies" : "y"}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                ← Prev
              </Button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <CompanyFormDialog
        open={formOpen}
        onClose={handleFormClose}
        initialData={editTarget}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this company record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteCompany.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              {deleteCompany.isPending ? "Deleting…" : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
