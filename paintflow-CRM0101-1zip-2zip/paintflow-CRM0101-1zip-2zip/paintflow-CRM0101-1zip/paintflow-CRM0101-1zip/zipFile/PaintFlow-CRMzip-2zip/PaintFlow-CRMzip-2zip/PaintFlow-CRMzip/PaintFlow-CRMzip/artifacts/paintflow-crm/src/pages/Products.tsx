import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Package, MoreHorizontal, Filter } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ["products", "categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .order("category");
      const rows = (data ?? []) as { category: string }[];
      const unique = [...new Set(rows.map((p) => p.category))];
      return unique;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, category],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`
        );
      }

      if (category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Products"
        subtitle="Manage your paint and supply catalog"
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories ?? []).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Brand</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Unit</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !products || products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {search || category !== "all"
                          ? "No products match your filters"
                          : "No products yet"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.brand ?? "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {product.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.unit}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
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
      </div>
    </div>
  );
}
