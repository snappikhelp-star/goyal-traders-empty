import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Payment } from "@/types";

// ─── Types ───────────────────────────────────────────────────

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:          "Cash",
  upi:           "UPI",
  bank_transfer: "Bank Transfer",
  cheque:        "Cheque",
  card:          "Card",
  other:         "Other",
};

export interface RecordPaymentPayload {
  billId:      string;
  customerId:  string;
  amount:      number;
  method:      PaymentMethod;
  date:        string;
  reference?:  string;
  notes?:      string;
}

export interface RecordPaymentResult {
  success:     boolean;
  payment_id:  string;
  bill_id:     string;
  customer_id: string;
  bill_number: string;
  amount:      number;
  paid_amount: number;
  remaining:   number;
  new_status:  string;
}

// ─── Record Payment Mutation ──────────────────────────────────

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload): Promise<RecordPaymentResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("record_payment", {
        p_bill_id:   payload.billId,
        p_amount:    payload.amount,
        p_method:    payload.method,
        p_date:      payload.date,
        p_reference: payload.reference ?? null,
        p_notes:     payload.notes ?? null,
      });
      if (error) {
        const msg = (error.message as string) ?? "Failed to record payment";
        const clean = msg.replace(/^[A-Z_]+:\s*/, "");
        throw new Error(clean);
      }
      return data as RecordPaymentResult;
    },
    onSuccess: (result, payload) => {
      const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
      toast.success(`₹${fmt.format(result.amount).replace("₹", "")} recorded · Bill ${result.new_status.replace(/_/g, " ")}`);

      void qc.invalidateQueries({ queryKey: ["bill", result.bill_id] });
      void qc.invalidateQueries({ queryKey: ["bill-payments", result.bill_id] });
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["customer", payload.customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-stats", payload.customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-payments", payload.customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-bills", payload.customerId] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["payment-stats"] });
      void qc.invalidateQueries({ queryKey: ["outstanding-bills"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Payment Stats (Dashboard) ────────────────────────────────

export interface PaymentStats {
  totalOutstanding: number;
  collectedToday:   number;
  overdueBills:     number;
  overdueAmount:    number;
}

export function usePaymentStats() {
  return useQuery<PaymentStats>({
    queryKey: ["payment-stats"],
    queryFn: async (): Promise<PaymentStats> => {
      const today = new Date().toISOString().split("T")[0];

      const [outRes, todayRes, overdueRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("customers")
          .select("pending_balance")
          .gt("pending_balance", 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("payments")
          .select("amount")
          .eq("payment_date", today),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("bills")
          .select("total, paid_amount", { count: "exact" })
          .eq("status", "overdue"),
      ]);

      const totalOutstanding = ((outRes.data ?? []) as { pending_balance: number }[]).reduce(
        (s, r) => s + (r.pending_balance ?? 0),
        0,
      );
      const collectedToday = ((todayRes.data ?? []) as { amount: number }[]).reduce(
        (s, r) => s + (r.amount ?? 0),
        0,
      );
      const overdueBills   = overdueRes.count ?? 0;
      const overdueAmount  = ((overdueRes.data ?? []) as { total: number; paid_amount: number }[]).reduce(
        (s, r) => s + (r.total - (r.paid_amount ?? 0)),
        0,
      );

      return { totalOutstanding, collectedToday, overdueBills, overdueAmount };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ─── All Payments (paginated, filterable) ─────────────────────

export const PAYMENTS_PAGE_SIZE = 25;

export type PaymentRow = Payment & {
  customer?: { name: string; phone: string | null } | null;
  bill?:     { bill_number: string; total: number }  | null;
};

export function useAllPayments(params: {
  page:      number;
  method?:   string;
  dateFrom?: string;
  dateTo?:   string;
  search?:   string;
}) {
  const { page, method, dateFrom, dateTo, search } = params;
  return useQuery({
    queryKey: ["payments", "list", page, method, dateFrom, dateTo, search],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("payments")
        .select(
          "*, customer:customers(name, phone), bill:bills(bill_number, total)",
          { count: "exact" },
        )
        .order("payment_date", { ascending: false })
        .order("created_at",   { ascending: false })
        .range((page - 1) * PAYMENTS_PAGE_SIZE, page * PAYMENTS_PAGE_SIZE - 1);

      if (method && method !== "all") q = q.eq("payment_method", method);
      if (dateFrom)                   q = q.gte("payment_date", dateFrom);
      if (dateTo)                     q = q.lte("payment_date", dateTo);

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);

      const rows = ((data ?? []) as PaymentRow[]).map((p) => ({
        ...p,
        customer: Array.isArray(p.customer) ? (p.customer[0] ?? null) : p.customer,
        bill:     Array.isArray(p.bill)     ? (p.bill[0]     ?? null) : p.bill,
      }));

      return { data: rows, count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Outstanding Bills ────────────────────────────────────────

export type OutstandingBill = {
  id:          string;
  bill_number: string;
  date:        string;
  due_date:    string | null;
  status:      string;
  total:       number;
  paid_amount: number;
  remaining:   number;
  customer?:   { id: string; name: string; phone: string | null; pending_balance: number } | null;
};

export function useOutstandingBills(params: { page: number; search?: string }) {
  const { page, search } = params;
  return useQuery({
    queryKey: ["outstanding-bills", page, search],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("bills")
        .select("id, bill_number, date, due_date, status, total, paid_amount, customer:customers(id, name, phone, pending_balance)", { count: "exact" })
        .in("status", ["unpaid", "partially_paid", "overdue", "sent"])
        .order("due_date",  { ascending: true,  nullsFirst: false })
        .order("date",      { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);

      const rows = ((data ?? []) as (Omit<OutstandingBill, "remaining" | "customer"> & { customer: unknown })[]).map(
        (b: any) => ({
          ...b,
          remaining: b.total - (b.paid_amount ?? 0),
          customer:  Array.isArray(b.customer) ? (b.customer[0] ?? null) : b.customer,
        }),
      ) as OutstandingBill[];

      return { data: rows, count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Daily Collection Report ──────────────────────────────────

export type DailyPaymentRow = Payment & {
  customer?: { name: string; phone: string | null } | null;
  bill?:     { bill_number: string }               | null;
};

export function useDailyCollection(date: string) {
  return useQuery({
    queryKey: ["daily-collection", date],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*, customer:customers(name, phone), bill:bills(bill_number)")
        .eq("payment_date", date)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return ((data ?? []) as DailyPaymentRow[]).map((p) => ({
        ...p,
        customer: Array.isArray(p.customer) ? (p.customer[0] ?? null) : p.customer,
        bill:     Array.isArray(p.bill)     ? (p.bill[0]     ?? null) : p.bill,
      }));
    },
    enabled: !!date,
    staleTime: 60_000,
  });
}

// ─── Monthly Collection Report ────────────────────────────────

export interface MonthlyData {
  month:     string;
  monthName: string;
  total:     number;
  count:     number;
  byMethod:  Record<string, number>;
}

export function useMonthlyCollection(year: number) {
  return useQuery<MonthlyData[]>({
    queryKey: ["monthly-collection", year],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("amount, payment_date, payment_method")
        .gte("payment_date", `${year}-01-01`)
        .lte("payment_date", `${year}-12-31`);

      if (error) throw new Error(error.message);

      const months: Record<string, MonthlyData> = {};
      for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, "0");
        months[key] = {
          month:     key,
          monthName: new Date(year, m - 1, 1).toLocaleDateString("en-IN", { month: "long" }),
          total:     0,
          count:     0,
          byMethod:  {},
        };
      }

      for (const p of (data ?? []) as { amount: number; payment_date: string; payment_method: string }[]) {
        const m = p.payment_date.slice(5, 7);
        if (!months[m]) continue;
        months[m].total    += p.amount;
        months[m].count    += 1;
        months[m].byMethod[p.payment_method] = (months[m].byMethod[p.payment_method] ?? 0) + p.amount;
      }

      return Object.values(months);
    },
  });
}
