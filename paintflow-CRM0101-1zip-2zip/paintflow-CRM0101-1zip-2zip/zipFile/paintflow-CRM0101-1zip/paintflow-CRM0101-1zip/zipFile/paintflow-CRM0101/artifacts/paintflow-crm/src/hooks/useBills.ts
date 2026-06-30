import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import type { Customer, Product } from "@/types";

// ─── Types ───────────────────────────────────────────────────

export type ProductWithStock = Product & { stock: number };

export interface LineItem {
  _id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  shade_number: string | null;
  pack_size: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
  stock_available: number;
  room_area: string | null;
  house_mapping_id: string | null;
}

export interface CreateBillPayload {
  customer_id: string;
  date: string;
  due_date: string | null;
  payment_method: string;
  notes: string | null;
  paid_amount: number;
  items: LineItem[];
}

export interface CreateInvoiceResult {
  success: boolean;
  bill_id: string;
  bill_number: string;
  total: number;
  paid_amount: number;
  pending: number;
  status: string;
}

// ─── Pure helpers ─────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcRow(item: LineItem): LineItem {
  const base = item.quantity * item.unit_price;
  const discountAmt = base * (item.discount_pct / 100);
  const taxable = base - discountAmt;
  const gst_amount = round2(taxable * (item.gst_rate / 100));
  const line_total = round2(taxable + gst_amount);
  return { ...item, gst_amount, line_total };
}

// ─── Product search (with stock) ─────────────────────────────

export function useProductSearch(search: string) {
  return useQuery({
    queryKey: ["product-search", search],
    queryFn: async (): Promise<ProductWithStock[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from("products") as any)
        .select("*, inventory(quantity)")
        .order("name")
        .limit(30);

      // Only show active products in billing search
      query = query.eq("is_active", true);

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,shade_number.ilike.%${search}%,barcode.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((p: any) => {
        const inv = p.inventory;
        const stock: number = Array.isArray(inv)
          ? (inv[0]?.quantity ?? 0)
          : (inv?.quantity ?? 0);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { inventory: _inv, ...rest } = p;
        return { ...rest, stock } as ProductWithStock;
      });
    },
    placeholderData: (prev: ProductWithStock[] | undefined) => prev,
  });
}

// ─── Customer search (lightweight for picker) ────────────────

export type CustomerSummary = Pick<Customer, "id" | "name" | "phone" | "city">;

export function useCustomerSearch(search: string) {
  return useQuery({
    queryKey: ["customer-search-bill", search],
    queryFn: async (): Promise<CustomerSummary[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from("customers") as any)
        .select("id, name, phone, city")
        .order("name")
        .limit(20);

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,phone.ilike.%${search}%,alternate_mobile.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerSummary[];
    },
    placeholderData: (prev: CustomerSummary[] | undefined) => prev,
  });
}

// ─── Create bill via atomic RPC ───────────────────────────────
//
// Calls the create_invoice() SECURITY DEFINER PostgreSQL function
// which atomically:
//   1. Validates auth + inputs
//   2. Pre-validates and locks inventory rows (prevents race conditions)
//   3. Inserts the bill header (trigger generates bill_number)
//   4. Inserts all bill_items
//   5. Deducts inventory (CHECK constraint prevents negatives)
//   6. Stores paint shade history for items with shade_number
//   7. Updates customer stats (total_purchase_amount, total_purchase_count,
//      pending_balance, last_purchase_date)
//   8. Creates a payment record if paid_amount > 0
//   9. Writes an audit log entry
//  10. Rolls back everything on any error
//
// On success, invalidates all affected React Query caches.

export function useCreateBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBillPayload): Promise<CreateInvoiceResult> => {
      const rpcPayload: Json = {
        customer_id:    payload.customer_id,
        date:           payload.date,
        due_date:       payload.due_date ?? null,
        payment_method: payload.payment_method,
        notes:          payload.notes ?? null,
        paid_amount:    payload.paid_amount,
        items: payload.items.map((item) => ({
          product_id:      item.product_id,
          product_name:    item.product_name,
          brand:           item.brand ?? null,
          shade_number:    item.shade_number ?? null,
          pack_size:       item.pack_size ?? null,
          quantity:        item.quantity,
          unit_price:      item.unit_price,
          discount_pct:    item.discount_pct,
          gst_rate:        item.gst_rate,
          room_area:       item.room_area ?? null,
          house_mapping_id: item.house_mapping_id ?? null,
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("create_invoice", {
        p_payload: rpcPayload,
      });

      if (error) {
        // Surface the PostgreSQL RAISE EXCEPTION message directly so the
        // user sees "STOCK: Insufficient stock …" rather than a raw code.
        throw new Error(error.message);
      }

      const result = data as CreateInvoiceResult;

      if (!result?.success) {
        throw new Error("Invoice creation failed: unexpected server response");
      }

      return result;
    },

    onSuccess: (result) => {
      // Invalidate every cache that the RPC may have mutated:
      //   bills            — new bill row
      //   customers        — total_purchase_amount / pending_balance / last_purchase_date
      //   inventory        — stock quantities reduced
      //   payments         — new payment row (when paid_amount > 0)
      //   customer-paint-shades — shade history rows inserted
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["customer-paint-shades"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });

      toast.success(`Invoice ${result.bill_number} created`);
    },

    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Quick-create customer (inline modal) ────────────────────

export function useQuickCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; phone: string }): Promise<CustomerSummary> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("customers") as any)
        .insert(values)
        .select("id, name, phone, city")
        .single();
      if (error) throw new Error(error.message);
      return data as CustomerSummary;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customer-search-bill"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
