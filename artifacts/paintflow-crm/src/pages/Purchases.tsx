import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Search, ShoppingCart, MoreHorizontal,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, Edit, Trash2, X, SlidersHorizontal,
  Building2, Calendar, IndianRupee,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Header from "@/components/layout/Header";
import { useDebounce } from "@/hooks/useDebounce";
import {
  usePurchases, useDeletePurchase,
  type Purchase, type PurchaseSortField,
} from "@/hooks/usePurchases";
import { usePurchase } from "@/hooks/usePurchases";

const PAGE_SIZE = 15;

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid", partial: "Partial", due: "Due",
};
const STATUS_CLASS: Record<string, string> = {
  paid:    "bg-green-100 text-green-700 border-green-200",
  partial: "bg-amber-100  text-amber-700  border-amber-200",
  due:     "bg-red-100    text-red-700    border-red-200",
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function SortHead({
  field, label, sortField, sortAsc, onSort,
}: {
  field: PurchaseSortField; label: string;
  sortField: PurchaseSortField; sortAsc: boolean;
  onSort: (f: PurchaseSortField) => void;
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
          ? sortAsc ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-25" />}
      </div>
    </TableHead>
  );
}

/** Wrapper so we can fetch items only when deleting */
function DeleteDialog({
  target,
  onClose,
}: {
  target: Purchase;
  onClose: () => void;
}) {
  const { data: full } = usePurchase(target.id);
  const deletePurchase = useDeletePurchase();

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Purchase {target.invoice_number}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this purchase and reverse the associated stock additions.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              deletePurchase.mutate(
                {
                  id: target.id,
                  companyId: target.company_id,
                  items: full?.purchase_items ?? [],
                },
                { onSuccess: onClose },
              );
            }}
          >
            {deletePurchase.isPending ? "Deleting…" : "Delete Purchase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Purchases() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [sortField, setSortField]     = useState<PurchaseSortField>("invoice_date");
  const [sortAsc, setSortAsc]         = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = usePurchases({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    sortField,
    sortAsc,
    status: statusFilter,
  });

  const purchases  = data?.purchases ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!statusFilter;

  const handleSort = (field: PurchaseSortField) => {
    if (sortField === field) setSortAsc((a) => !a);
    else { setSortField(field); setSortAsc(field === "invoice_date" ? false : true); }
    setPage(1);
  };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Purchases"
        subtitle={isLoading ? "Loading…" : `${total} purchase${total !== 1 ? "s" : ""}`}
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link to="/purchases/new">
              <Plus className="h-4 w-4" /> New Purchase
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by invoice number…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters || hasFilters ? "secondary" : "outline"}
            size="sm" className="gap-2 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                1
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-4 flex-wrap rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</span>
              <Select value={statusFilter || "_all"} onValueChange={(v) => { setStatusFilter(v === "_all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => { setStatusFilter(""); setPage(1); }}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortHead field="invoice_number" label="Invoice"      sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="font-semibold">Company</TableHead>
                <SortHead field="invoice_date"   label="Date"         sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortHead field="grand_total"    label="Total"        sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="font-semibold">Paid</TableHead>
                <TableHead className="font-semibold">Due</TableHead>
                <SortHead field="status"         label="Status"       sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" style={{ width: j === 7 ? 32 : 90 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {search || hasFilters ? "No purchases match your search" : "No purchases yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {!search && !hasFilters && "Record your first stock purchase to get started"}
                        </p>
                      </div>
                      {!search && !hasFilters && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/purchases/new">
                            <Plus className="h-4 w-4 mr-1.5" /> New Purchase
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    {/* Invoice */}
                    <TableCell>
                      <button
                        onClick={() => navigate(`/purchases/${p.id}`)}
                        className="text-sm font-mono font-medium hover:text-primary hover:underline text-left"
                      >
                        {p.invoice_number}
                      </button>
                    </TableCell>

                    {/* Company */}
                    <TableCell>
                      {p.company ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{p.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {fmtDate(p.invoice_date)}
                      </div>
                    </TableCell>

                    {/* Total */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {fmtCurrency(p.grand_total).replace("₹", "")}
                      </div>
                    </TableCell>

                    {/* Paid */}
                    <TableCell className="text-sm text-green-700 font-medium">
                      {fmtCurrency(p.paid_amount)}
                    </TableCell>

                    {/* Due */}
                    <TableCell className={`text-sm font-medium ${p.due_amount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {p.due_amount > 0 ? fmtCurrency(p.due_amount) : "—"}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[p.status] ?? ""}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>← Prev</Button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Next →</Button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
