import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Warehouse, MoreHorizontal, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { InventoryItem } from "@/types";

export default function Inventory() {
  const [search, setSearch] = useState("");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", search],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("*, product:products(name, sku, category, unit)")
        .order("last_updated", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const filtered = search.trim()
        ? (data as InventoryItem[]).filter((item) =>
            item.product?.name?.toLowerCase().includes(search.toLowerCase())
          )
        : (data as InventoryItem[]);

      return filtered;
    },
  });

  const isLowStock = (item: InventoryItem) => item.quantity <= item.min_quantity;

  const stockPercent = (item: InventoryItem) => {
    if (item.min_quantity === 0) return 100;
    return Math.min(100, Math.round((item.quantity / (item.min_quantity * 3)) * 100));
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Inventory"
        subtitle="Track stock levels for all your paint products"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Min. Stock</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Last Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !inventory || inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Warehouse className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {search ? "No items match your search" : "No inventory records yet"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{item.product?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.product?.sku ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {item.product?.category ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {item.quantity}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.product?.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.min_quantity}</TableCell>
                    <TableCell>
                      {isLowStock(item) ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          In Stock
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.location ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Adjust Quantity</DropdownMenuItem>
                          <DropdownMenuItem>Set Min Stock</DropdownMenuItem>
                          <DropdownMenuItem>Update Location</DropdownMenuItem>
                          <DropdownMenuItem>View History</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
