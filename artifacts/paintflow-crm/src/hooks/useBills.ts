import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, buildQuery } from "@/lib/api";
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
      const qs = buildQuery({ search, activeOnly: true });
      return api.get<ProductWithStock[]>(`/products${qs}`);
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
      const qs = buildQuery({ q: search });
      return api.get<CustomerSummary[]>(`/customers/search${qs}`);
    },
    placeholderData: (prev: CustomerSummary[] | undefined) => prev,
  });
}

// ─── Create bill ──────────────────────────────────────────────
//
// POST /bills atomically:
//   1. Validates inputs and locks inventory rows (prevents race conditions)
//   2. Inserts the bill header (server generates bill_number)
//   3. Inserts all bill_items and deducts inventory
//   4. Stores paint shade history for items with a shade name/code
//   5. Creates a payment record if paid_amount > 0
//   6. Updates customer.last_purchase_date
//
// On success, invalidates all affected React Query caches.

export function useCreateBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBillPayload): Promise<CreateInvoiceResult> => {
      const body = {
        customer_id: payload.customer_id,
        date: payload.date,
        due_date: payload.due_date ?? null,
        payment_method: payload.payment_method,
        notes: payload.notes ?? null,
        paid_amount: payload.paid_amount,
        items: payload.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: round2((item.quantity * item.unit_price) * (item.discount_pct / 100)),
          gst_rate: item.gst_rate,
          shade_name: item.shade_number ?? undefined,
          room_area: item.room_area ?? undefined,
          house_mapping_id: item.house_mapping_id ?? undefined,
        })),
      };

      const result = await api.post<CreateInvoiceResult>("/bills", body);

      if (!result?.success) {
        throw new Error("Invoice creation failed: unexpected server response");
      }

      return result;
    },

    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["customer-paint-shades"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(`Invoice ${result.bill_number} created`);
    },

    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Quick-create customer (inline modal) ────────────────────

export function useQuickCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; phone: string }): Promise<CustomerSummary> =>
      api.post<CustomerSummary>("/customers", values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customer-search-bill"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
