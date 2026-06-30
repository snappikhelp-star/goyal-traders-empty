import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
}

export interface CreateBillPayload {
  customer_id: string;
  date: string;
  due_date: string | null;
  payment_method: string;
  notes: string | null;
  status: "draft" | "sent" | "paid";
  items: LineItem[];
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
    // always keep stale data shown while fetching
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

// ─── Create bill (with rollback on item failure) ─────────────

export function useCreateBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBillPayload) => {
      const { items, ...header } = payload;

      const subtotal    = round2(items.reduce((s, r) => s + r.quantity * r.unit_price, 0));
      const discount    = round2(items.reduce((s, r) => s + round2(r.quantity * r.unit_price * (r.discount_pct / 100)), 0));
      const tax         = round2(items.reduce((s, r) => s + r.gst_amount, 0));
      const total       = round2(items.reduce((s, r) => s + r.line_total, 0));

      // 1 ── Insert bill header (trigger auto-generates bill_number)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bill, error: billError } = await (supabase.from("bills") as any)
        .insert({
          ...header,
          subtotal,
          discount,
          tax_rate: 0,      // stored per-item; header holds aggregate
          tax,
          total,
          paid_amount: 0,
        })
        .select()
        .single();

      if (billError) throw new Error(billError.message);

      // 2 ── Insert all line items
      const billItems = items.map((item) => ({
        bill_id:      bill.id,
        product_id:   item.product_id,
        product_name: item.product_name,
        brand:        item.brand,
        shade_number: item.shade_number,
        pack_size:    item.pack_size,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
        discount:     round2(item.quantity * item.unit_price * (item.discount_pct / 100)),
        gst_rate:     item.gst_rate,
        gst_amount:   item.gst_amount,
        total:        item.line_total,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from("bill_items") as any).insert(billItems);

      if (itemsError) {
        // Rollback — delete the orphaned bill header
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("bills") as any).delete().eq("id", bill.id);
        throw new Error(`Items save failed (rolled back): ${itemsError.message}`);
      }

      return bill as { id: string; bill_number: string };
    },

    onSuccess: (bill) => {
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Invoice ${bill.bill_number} created`);
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
