import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Search, Users, MoreHorizontal,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Phone, MapPin, MessageCircle, Edit, Trash2, Eye, X, SlidersHorizontal,
  Calendar,
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
import { useCustomers, useDeleteCustomer } from "@/hooks/useCustomers";
import type { CustomerSortField } from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import { INDIAN_STATES } from "@/types";
import type { Customer } from "@/types";

function SortHead({
  field, label, sortField, sortAsc, onSort,
}: {
  field: CustomerSortField; label: string; sortField: CustomerSortField;
  sortAsc: boolean; onSort: (f: CustomerSortField) => void;
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

const fmtDate = (d: string | null | undefined) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<CustomerSortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const PAGE_SIZE = 15;
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useCustomers({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    sortField,
    sortAsc,
    city: cityFilter,
    state: stateFilter,
  });

  const deleteCustomer = useDeleteCustomer();
  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = !!cityFilter || !!stateFilter;

  const handleSort = (field: CustomerSortField) => {
    if (sortField === field) setSortAsc((a) => !a);
    else {
      setSortField(field);
      // Default descending for last_purchase_date (most recent first)
      setSortAsc(field !== "last_purchase_date");
    }
    setPage(1);
  };

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };

  const handleWhatsApp = (c: Customer) => {
    if (!c.phone) return;
    const ph = c.phone.replace(/\D/g, "");
    const intl = ph.length === 10 ? `91${ph}` : ph;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`Hello ${c.name}, `)}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Customers"
        subtitle={isLoading ? "Loading…" : `${total} customer${total !== 1 ? "s" : ""}`}
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link to="/customers/new">
              <Plus className="h-4 w-4" />
              Add Customer
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── Search + Filter bar ─────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, mobile or address…"
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
            variant={showFilters || hasActiveFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {[cityFilter, stateFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* ── Filter Panel ────────────────────────────────── */}
        {showFilters && (
          <div className="flex items-center gap-4 flex-wrap rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">City</span>
              <Input
                placeholder="Filter by city…"
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                className="h-8 w-36 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">State</span>
              <Select
                value={stateFilter || "_all"}
                onValueChange={(v) => { setStateFilter(v === "_all" ? "" : v); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="_all">All States</SelectItem>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => { setCityFilter(""); setStateFilter(""); setPage(1); }}
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────── */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortHead field="name" label="Customer" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortHead field="city" label="Location" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="font-semibold">GST Number</TableHead>
                <SortHead field="last_purchase_date" label="Last Purchase" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <SortHead field="created_at" label="Added" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} />
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <Users className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {search || hasActiveFilters
                            ? "No customers match your search"
                            : "No customers yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {!search && !hasActiveFilters && "Add your first customer to get started"}
                        </p>
                      </div>
                      {!search && !hasActiveFilters && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/customers/new">
                            <Plus className="h-4 w-4 mr-1.5" /> Add First Customer
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const initials = customer.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const lastPurchase = fmtDate(customer.last_purchase_date);
                  const addedDate = fmtDate(customer.created_at);

                  return (
                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                      {/* Customer */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold select-none">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="text-sm font-medium hover:text-primary hover:underline truncate block text-left"
                            >
                              {customer.name}
                            </button>
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{customer.phone}</span>
                                {customer.alternate_mobile && (
                                  <span className="text-muted-foreground/50">
                                    &nbsp;/ {customer.alternate_mobile}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {/* Location */}
                      <TableCell>
                        {customer.city || customer.state ? (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              {customer.city && <p className="truncate">{customer.city}</p>}
                              {customer.state && (
                                <p className="text-xs text-muted-foreground/60 truncate">
                                  {customer.state}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                      {/* GST */}
                      <TableCell>
                        {customer.gst_number ? (
                          <span className="font-mono text-xs bg-muted rounded px-2 py-0.5">
                            {customer.gst_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                      {/* Last Purchase */}
                      <TableCell>
                        {lastPurchase ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{lastPurchase}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-normal">
                            No purchases
                          </Badge>
                        )}
                      </TableCell>
                      {/* Added */}
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {addedDate ?? "—"}
                      </TableCell>
                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => navigate(`/customers/${customer.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/customers/${customer.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleWhatsApp(customer)}
                              disabled={!customer.phone}
                            >
                              <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                              WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(customer)}
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

        {/* ── Pagination ──────────────────────────────────── */}
        {total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing{" "}
              {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)}{" "}
              of {total} customer{total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </Button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirmation ──────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer and all their notes, photos, and records.
              Bills will remain but will lose the customer link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteCustomer.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              {deleteCustomer.isPending ? "Deleting…" : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
