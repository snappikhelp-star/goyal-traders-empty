import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────

export interface InventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  location: string | null;
  last_updated: string;
  product: {
    id: string;
    name: string;
    sku: string;
    brand: string | null;
    category: string;
    unit: string;
    price: number;
    purchase_price: number;
    shade_number: string | null;
    pack_size: string | null;
    barcode: string | null;
    is_active: boolean;
  };
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: "stock_in" | "stock_out" | "adjustment" | "sale" | "return";
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  product?: { name: string; sku: string; unit: string };
}

export type StockAlertFilter = "all" | "low_stock" | "out_of_stock" | "ok";

export const INV_TX_PAGE_SIZE = 30;
export const INV_PAGE_SIZE    = 50;

// ─── Inventory list ───────────────────────────────────────────

export function useInventoryItems(params: {
  search: string;
  alertFilter: StockAlertFilter;
  page: number;
}) {
  const { search, alertFilter, page } = params;
  return useQuery({
    queryKey: ["inventory", "list", page, search, alertFilter],
    queryFn: async (): Promise<{ data: InventoryRow[]; count: number }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("inventory")
        .select(
          `*, product:products(
            id, name, sku, brand, category, unit, price, purchase_price,
            shade_number, pack_size, barcode, is_active
          )`,
          { count: "exact" }
        )
        .order("last_updated", { ascending: false })
        .range((page - 1) * INV_PAGE_SIZE, page * INV_PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows = (data ?? []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? item.product[0] : item.product,
        reserved_quantity: item.reserved_quantity ?? 0,
        reorder_level:     item.reorder_level ?? 0,
      })) as InventoryRow[];

      // Client-side text filter (Supabase doesn't support filtering on joined columns server-side easily)
      if (search.trim()) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.product?.name?.toLowerCase().includes(q) ||
            r.product?.sku?.toLowerCase().includes(q) ||
            r.product?.brand?.toLowerCase().includes(q) ||
            r.product?.barcode?.toLowerCase().includes(q)
        );
      }

      if (alertFilter === "out_of_stock") {
        rows = rows.filter((r) => r.quantity === 0);
      } else if (alertFilter === "low_stock") {
        rows = rows.filter((r) => r.quantity > 0 && r.quantity <= r.min_quantity);
      } else if (alertFilter === "ok") {
        rows = rows.filter((r) => r.quantity > r.min_quantity);
      }

      return { data: rows, count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Inventory stats (dashboard cards) ───────────────────────

export interface InventoryStats {
  totalProducts: number;
  outOfStock:    number;
  lowStock:      number;
  totalStockValue: number;
  totalItems:    number;
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ["inventory", "stats"],
    queryFn: async (): Promise<InventoryStats> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("inventory")
        .select(
          "quantity, min_quantity, product:products(price, purchase_price, is_active)"
        );
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((r: any) => ({
        ...r,
        product: Array.isArray(r.product) ? r.product[0] : r.product,
      }));

      let outOfStock = 0;
      let lowStock   = 0;
      let totalValue = 0;
      let totalQty   = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of rows as any[]) {
        if (r.quantity === 0) outOfStock++;
        else if (r.quantity <= (r.min_quantity ?? 0)) lowStock++;
        const pp = r.product?.purchase_price ?? r.product?.price ?? 0;
        totalValue += r.quantity * pp;
        totalQty   += r.quantity;
      }

      return {
        totalProducts:   rows.length,
        outOfStock,
        lowStock,
        totalStockValue: totalValue,
        totalItems:      totalQty,
      };
    },
    staleTime: 30_000,
  });
}

// ─── Inventory transactions (history) ────────────────────────

export function useInventoryTransactions(params: {
  productId?: string;
  txType?: string;
  page: number;
}) {
  const { productId, txType, page } = params;
  return useQuery({
    queryKey: ["inventory-transactions", page, productId, txType],
    queryFn: async (): Promise<{ data: InventoryTransaction[]; count: number }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("inventory_transactions")
        .select(
          "*, product:products(name, sku, unit)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(
          (page - 1) * INV_TX_PAGE_SIZE,
          page * INV_TX_PAGE_SIZE - 1
        );

      if (productId) query = query.eq("product_id", productId);
      if (txType && txType !== "all") query = query.eq("transaction_type", txType);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((r: any) => ({
        ...r,
        product: Array.isArray(r.product) ? r.product[0] : r.product,
      })) as InventoryTransaction[];

      return { data: rows, count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Stock movement mutation (calls record_stock_movement RPC) ─

export interface StockMovementPayload {
  productId:       string;
  type:            "stock_in" | "stock_out" | "adjustment";
  quantityDelta:   number;
  notes?:          string;
  referenceType?:  string;
  referenceId?:    string;
}

export function useStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StockMovementPayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "record_stock_movement",
        {
          p_product_id:      payload.productId,
          p_type:            payload.type,
          p_quantity_change: payload.quantityDelta,
          p_notes:           payload.notes ?? null,
          p_reference_type:  payload.referenceType ?? null,
          p_reference_id:    payload.referenceId ?? null,
        }
      );
      if (error) throw new Error(error.message);
      return data as {
        success: boolean;
        quantity_before: number;
        quantity_after: number;
        quantity_change: number;
      };
    },
    onSuccess: (result, payload) => {
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });

      const typeLabel =
        payload.type === "stock_in"
          ? "Stock In"
          : payload.type === "stock_out"
          ? "Stock Out"
          : "Adjustment";
      toast.success(
        `${typeLabel} recorded. New stock: ${result.quantity_after}`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Update inventory settings (min stock, reorder, location) ─

export function useUpdateInventorySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      min_quantity,
      reorder_level,
      location,
    }: {
      productId:     string;
      min_quantity:  number;
      reorder_level: number;
      location:      string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("inventory")
        .update({
          min_quantity,
          reorder_level,
          location: location.trim() || null,
          last_updated: new Date().toISOString(),
        })
        .eq("product_id", productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory settings updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
