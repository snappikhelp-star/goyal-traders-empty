import { useState } from "react";
import {
  Search, Warehouse, MoreHorizontal, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, SlidersHorizontal, Package2,
  ChevronLeft, ChevronRight, X, History, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import {
  useInventoryItems, useInventoryStats, useInventoryTransactions,
  useStockMovement, useUpdateInventorySettings,
  INV_TX_PAGE_SIZE, INV_PAGE_SIZE,
  type InventoryRow, type StockAlertFilter,
} from "@/hooks/useInventory";

// ─── Helpers ──────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
const fmtINR = (n: number) => INR.format(n);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function stockStatus(qty: number, min: number): "out" | "low" | "ok" {
  if (qty === 0) return "out";
  if (qty <= min) return "low";
  return "ok";
}

// ─── Stock movement dialog ────────────────────────────────────

type OpType = "stock_in" | "stock_out" | "adjustment";

interface StockOpDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryRow | null;
  defaultOp?: OpType;
}

function StockOpDialog({ open, onClose, item, defaultOp = "stock_in" }: StockOpDialogProps) {
  const [op, setOp] = useState<OpType>(defaultOp);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const stockMovement = useStockMovement();

  const currentQty = item?.quantity ?? 0;

  const handleSubmit = async () => {
    setError("");
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) {
      setError("Enter a positive quantity");
      return;
    }

    let delta: number;
    if (op === "stock_in") {
      delta = n;
    } else if (op === "stock_out") {
      if (n > currentQty) {
        setError(`Cannot remove more than current stock (${currentQty})`);
        return;
      }
      delta = -n;
    } else {
      // adjustment: qty is the target quantity
      delta = n - currentQty;
    }

    await stockMovement.mutateAsync({
      productId:     item!.product_id,
      type:          op,
      quantityDelta: delta,
      notes:         notes.trim() || undefined,
    });
    setQty("");
    setNotes("");
    onClose();
  };

  const opLabel = op === "stock_in" ? "Stock In" : op === "stock_out" ? "Stock Out" : "Adjust Stock";
  const newQty = (() => {
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) return currentQty;
    if (op === "stock_in") return currentQty + n;
    if (op === "stock_out") return Math.max(0, currentQty - n);
    return n; // adjustment = target
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{opLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-sm font-semibold">{item?.product?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              SKU: {item?.product?.sku} · Current stock:{" "}
              <span className="font-semibold">{currentQty} {item?.product?.unit}</span>
            </p>
          </div>

          {/* Operation selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["stock_in", "stock_out", "adjustment"] as OpType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setOp(t); setError(""); setQty(""); }}
                className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                  op === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {t === "stock_in" ? "Stock In" : t === "stock_out" ? "Stock Out" : "Adjust"}
              </button>
            ))}
          </div>

          {/* Quantity input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {op === "adjustment" ? "Target Quantity" : "Quantity"}
            </Label>
            <Input
              type="number"
              min={0}
              step={0.001}
              value={qty}
              onChange={(e) => { setQty(e.target.value); setError(""); }}
              placeholder={op === "adjustment" ? `Current: ${currentQty}` : "0"}
              className={`${error ? "border-destructive" : ""}`}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {qty && !isNaN(parseFloat(qty)) && (
              <p className="text-xs text-muted-foreground">
                New stock:{" "}
                <span className={newQty < 0 ? "text-red-600 font-semibold" : "font-semibold"}>
                  {Math.max(0, newQty)} {item?.product?.unit}
                </span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received from supplier, damaged batch…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1.5" />Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={stockMovement.isPending}
          >
            {stockMovement.isPending ? "Saving…" : opLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inventory Settings Dialog ────────────────────────────────

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryRow | null;
}

function InventorySettingsDialog({ open, onClose, item }: SettingsDialogProps) {
  const [minQty, setMinQty]     = useState("");
  const [reorder, setReorder]   = useState("");
  const [location, setLocation] = useState("");
  const updateSettings = useUpdateInventorySettings();

  // Populate on open
  useState(() => {
    if (open && item) {
      setMinQty(String(item.min_quantity));
      setReorder(String(item.reorder_level ?? 0));
      setLocation(item.location ?? "");
    }
  });

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      productId:     item!.product_id,
      min_quantity:  parseFloat(minQty) || 0,
      reorder_level: parseFloat(reorder) || 0,
      location,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Inventory Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm font-semibold">{item?.product?.name}</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Min Stock (alert threshold)</Label>
            <Input
              type="number" min={0} step={0.001}
              defaultValue={item?.min_quantity}
              onChange={(e) => setMinQty(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reorder Level</Label>
            <Input
              type="number" min={0} step={0.001}
              defaultValue={item?.reorder_level ?? 0}
              onChange={(e) => setReorder(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Storage Location</Label>
            <Input
              defaultValue={item?.location ?? ""}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shelf A3, Warehouse 2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Inventory page ──────────────────────────────────────

export default function Inventory() {
  const [search, setSearch]           = useState("");
  const [alertFilter, setAlertFilter] = useState<StockAlertFilter>("all");
  const [invPage, setInvPage]         = useState(1);
  const [txPage, setTxPage]           = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  const [opDialogOpen, setOpDialogOpen]     = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [activeItem, setActiveItem]         = useState<InventoryRow | null>(null);
  const [defaultOp, setDefaultOp]           = useState<"stock_in" | "stock_out" | "adjustment">("stock_in");

  const { data: stats } = useInventoryStats();
  const { data: invResult, isLoading } = useInventoryItems({
    search, alertFilter, page: invPage,
  });
  const { data: txResult, isLoading: txLoading } = useInventoryTransactions({
    page: txPage, txType: txTypeFilter,
  });

  const items   = invResult?.data ?? [];
  const invTotal = invResult?.count ?? 0;
  const invPages = Math.max(1, Math.ceil(invTotal / INV_PAGE_SIZE));

  const txItems  = txResult?.data ?? [];
  const txTotal  = txResult?.count ?? 0;
  const txPages  = Math.max(1, Math.ceil(txTotal / INV_TX_PAGE_SIZE));

  const openOp = (item: InventoryRow, op: typeof defaultOp) => {
    setActiveItem(item);
    setDefaultOp(op);
    setOpDialogOpen(true);
  };

  const openSettings = (item: InventoryRow) => {
    setActiveItem(item);
    setSettingsDialogOpen(true);
  };

  const hasAlerts = (stats?.outOfStock ?? 0) + (stats?.lowStock ?? 0) > 0;

  const TX_TYPE_COLORS: Record<string, string> = {
    stock_in:   "bg-green-100 text-green-700",
    stock_out:  "bg-red-100 text-red-700",
    adjustment: "bg-blue-100 text-blue-700",
    sale:       "bg-purple-100 text-purple-700",
    return:     "bg-amber-100 text-amber-700",
  };
  const TX_TYPE_LABELS: Record<string, string> = {
    stock_in: "Stock In", stock_out: "Stock Out",
    adjustment: "Adjustment", sale: "Sale", return: "Return",
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Inventory"
        subtitle="Track stock levels and movement history"
        actions={
          <Button size="sm" className="gap-2" onClick={() => {
            if (items.length > 0) openOp(items[0], "stock_in");
          }}>
            <TrendingUp className="h-4 w-4" />Stock In
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Alert banner ── */}
        {hasAlerts && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              {stats?.outOfStock ? (
                <span className="font-semibold">{stats.outOfStock} product{stats.outOfStock > 1 ? "s" : ""} out of stock</span>
              ) : null}
              {stats?.outOfStock && stats?.lowStock ? " · " : ""}
              {stats?.lowStock ? (
                <span className="font-semibold">{stats.lowStock} below minimum stock</span>
              ) : null}
              <button
                className="ml-3 text-amber-700 underline underline-offset-2 text-xs hover:no-underline"
                onClick={() => { setAlertFilter("out_of_stock"); }}
              >
                View affected items
              </button>
            </p>
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setAlertFilter("all")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Total SKUs</span>
              </div>
              <p className="text-2xl font-black">{stats?.totalProducts ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-red-200 transition-colors" onClick={() => setAlertFilter("out_of_stock")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-muted-foreground">Out of Stock</span>
              </div>
              <p className={`text-2xl font-black ${(stats?.outOfStock ?? 0) > 0 ? "text-red-600" : ""}`}>
                {stats?.outOfStock ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-amber-200 transition-colors" onClick={() => setAlertFilter("low_stock")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-muted-foreground">Low Stock</span>
              </div>
              <p className={`text-2xl font-black ${(stats?.lowStock ?? 0) > 0 ? "text-amber-600" : ""}`}>
                {stats?.lowStock ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Stock Value</span>
              </div>
              <p className="text-2xl font-black">
                {stats ? fmtINR(stats.totalStockValue) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="gap-2 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs">
              <History className="h-3.5 w-3.5" />Movement History
            </TabsTrigger>
          </TabsList>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Product name, SKU, brand…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setInvPage(1); }}
                  className="pl-9 h-9"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setInvPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select
                value={alertFilter}
                onValueChange={(v) => { setAlertFilter(v as StockAlertFilter); setInvPage(1); }}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="ok">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              {invTotal > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {invTotal} items
                </span>
              )}
            </div>

            {/* Inventory table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-right">Current Stock</TableHead>
                    <TableHead className="font-semibold text-right">Reserved</TableHead>
                    <TableHead className="font-semibold text-right">Available</TableHead>
                    <TableHead className="font-semibold text-right">Min Stock</TableHead>
                    <TableHead className="font-semibold text-right">Reorder At</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold text-xs">Last Updated</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(11)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Warehouse className="h-10 w-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">
                            {search || alertFilter !== "all"
                              ? "No items match your filters"
                              : "No inventory records yet"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const available = item.quantity - (item.reserved_quantity ?? 0);
                      const status    = stockStatus(item.quantity, item.min_quantity);
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <p className="font-medium text-sm">{item.product?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.product?.sku}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {item.product?.category ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {item.quantity}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              {item.product?.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
                            {item.reserved_quantity ?? 0}
                          </TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums text-sm ${available <= 0 ? "text-red-600" : ""}`}>
                            {available}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
                            {item.min_quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
                            {item.reorder_level ?? 0}
                          </TableCell>
                          <TableCell>
                            {status === "out" ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                <AlertTriangle className="h-3.5 w-3.5" />Out of Stock
                              </span>
                            ) : status === "low" ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                                <AlertTriangle className="h-3.5 w-3.5" />Low Stock
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />In Stock
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.location ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {fmtDate(item.last_updated)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openOp(item, "stock_in")}>
                                  <TrendingUp className="h-3.5 w-3.5 mr-2 text-green-600" />Stock In
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openOp(item, "stock_out")}>
                                  <TrendingDown className="h-3.5 w-3.5 mr-2 text-red-500" />Stock Out
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openOp(item, "adjustment")}>
                                  <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-blue-500" />Adjust Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSettings(item)}>
                                  <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />Settings
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

            {/* Inventory pagination */}
            {invPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {invPage} of {invPages}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={invPage <= 1}
                    onClick={() => setInvPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={invPage >= invPages}
                    onClick={() => setInvPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── History tab ── */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select value={txTypeFilter}
                onValueChange={(v) => { setTxTypeFilter(v); setTxPage(1); }}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="stock_in">Stock In</SelectItem>
                  <SelectItem value="stock_out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
              {txTotal > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {txTotal} transactions
                </span>
              )}
            </div>

            {/* Transactions table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Date & Time</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold text-right">Change</TableHead>
                    <TableHead className="font-semibold text-right">Before</TableHead>
                    <TableHead className="font-semibold text-right">After</TableHead>
                    <TableHead className="font-semibold">Reference</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : txItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No movement history yet
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    txItems.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDateTime(tx.created_at)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{tx.product?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tx.product?.sku}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TX_TYPE_COLORS[tx.transaction_type] ?? "bg-muted text-muted-foreground"}`}>
                            {TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums text-sm ${tx.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}>
                          {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change} {tx.product?.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
                          {tx.quantity_before}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {tx.quantity_after}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.reference_type ? `${tx.reference_type}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {tx.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Transactions pagination */}
            {txPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {txPage} of {txPages}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={txPage >= txPages}
                    onClick={() => setTxPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
      <StockOpDialog
        open={opDialogOpen}
        onClose={() => setOpDialogOpen(false)}
        item={activeItem}
        defaultOp={defaultOp}
      />
      <InventorySettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        item={activeItem}
      />
    </div>
  );
}
