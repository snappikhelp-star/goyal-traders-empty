import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Bill, BillItem, Payment, ShopSettings } from "@/types";

// ─── Single bill + customer join ────────────────────────────

export function useBill(id: string) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: async (): Promise<Bill> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("*, customer:customers(*)")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data as Bill;
    },
    enabled: !!id,
    retry: 1,
  });
}

// ─── Bill line items ─────────────────────────────────────────

export function useBillItems(billId: string) {
  return useQuery({
    queryKey: ["bill-items", billId],
    queryFn: async (): Promise<BillItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("bill_items")
        .select("*")
        .eq("bill_id", billId)
        .order("id");
      if (error) throw new Error(error.message);
      return (data ?? []) as BillItem[];
    },
    enabled: !!billId,
  });
}

// ─── Payments linked to this bill ────────────────────────────

export function useBillPayments(billId: string) {
  return useQuery({
    queryKey: ["bill-payments", billId],
    queryFn: async (): Promise<Payment[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*")
        .eq("bill_id", billId)
        .order("payment_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Payment[];
    },
    enabled: !!billId,
  });
}

// ─── Shop settings (cached for 5 min) ────────────────────────

export function useShopSettings() {
  return useQuery({
    queryKey: ["shop-settings"],
    queryFn: async (): Promise<ShopSettings> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("shop_settings")
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as ShopSettings;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
