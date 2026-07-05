import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type {
  Customer, CustomerNote, CustomerPhoto, HouseMapping,
  CustomerPaintShade, Payment, Bill, CustomerStats,
} from "@/types";

// ─── List with search / sort / paginate ─────────────────────────────────────

export type CustomerSortField =
  | "name" | "phone" | "city" | "created_at" | "last_purchase_date";

export interface CustomerListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: CustomerSortField;
  sortAsc?: boolean;
  city?: string;
  state?: string;
}

export function useCustomers({
  search = "",
  page = 1,
  pageSize = 15,
  sortField = "name",
  sortAsc = true,
  city = "",
  state = "",
}: CustomerListParams = {}) {
  return useQuery({
    queryKey: ["customers", { search, page, pageSize, sortField, sortAsc, city, state }],
    queryFn: async () => {
      let q = (supabase as any).from("customers").select("*", { count: "exact" });
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
      if (city)   q = q.ilike("city", city);
      if (state)  q = q.eq("state", state);
      q = q.order(sortField, { ascending: sortAsc });
      q = q.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, count, error } = await (q as any);
      if (error) throw new Error(error.message);
      return { customers: (data ?? []) as Customer[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Single customer ──────────────────────────────────────────────────────────

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customers").select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return data as Customer;
    },
    enabled: !!id,
  });
}

// ─── Customer aggregate stats ─────────────────────────────────────────────────

export function useCustomerStats(id: string) {
  return useQuery<CustomerStats>({
    queryKey: ["customer-stats", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("total, paid_amount, date, status")
        .eq("customer_id", id)
        .neq("status", "cancelled");
      if (error) throw new Error(error.message);
      type Row = { total: number; paid_amount: number; date: string; status: string };
      const rows = (data ?? []) as Row[];
      const dates = rows.map((r) => r.date).sort();
      return {
        totalBills:    rows.length,
        totalSpent:    rows.reduce((s, r) => s + r.total, 0),
        totalPaid:     rows.reduce((s, r) => s + r.paid_amount, 0),
        pendingAmount: rows.reduce((s, r) => s + Math.max(0, r.total - r.paid_amount), 0),
        firstPurchase: dates[0] ?? null,
        lastPurchase:  dates[dates.length - 1] ?? null,
      } satisfies CustomerStats;
    },
    enabled: !!id,
  });
}

// ─── Bills / Purchase History ─────────────────────────────────────────────────

export function useCustomerBills(customerId: string) {
  return useQuery({
    queryKey: ["customer-bills", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bills").select("*").eq("customer_id", customerId)
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Bill[];
    },
    enabled: !!customerId,
  });
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customer_notes")
        .select("*").eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerNote[];
    },
    enabled: !!customerId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_id, content }: { customer_id: string; content: string }) => {
      const { data, error } = await (supabase as any).from("customer_notes")
        .insert({ customer_id, content }).select().single();
      if (error) throw new Error(error.message);
      return data as CustomerNote;
    },
    onSuccess: (_data, { customer_id }) => {
      void qc.invalidateQueries({ queryKey: ["customer-notes", customer_id] });
      toast.success("Note added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customer_id }: { id: string; customer_id: string }) => {
      const { error } = await (supabase as any).from("customer_notes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return customer_id;
    },
    onSuccess: (customer_id) => {
      void qc.invalidateQueries({ queryKey: ["customer-notes", customer_id] });
      toast.success("Note deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export function useCustomerPhotos(customerId: string) {
  return useQuery({
    queryKey: ["customer-photos", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customer_photos")
        .select("*").eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerPhoto[];
    },
    enabled: !!customerId,
  });
}

export function useAddPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_id, url, caption }: { customer_id: string; url: string; caption?: string }) => {
      const { data, error } = await (supabase as any).from("customer_photos")
        .insert({ customer_id, url, caption: caption ?? null }).select().single();
      if (error) throw new Error(error.message);
      return data as CustomerPhoto;
    },
    onSuccess: (_data, { customer_id }) => {
      void qc.invalidateQueries({ queryKey: ["customer-photos", customer_id] });
      toast.success("Photo added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customer_id }: { id: string; customer_id: string }) => {
      const { error } = await (supabase as any).from("customer_photos").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return customer_id;
    },
    onSuccess: (customer_id) => {
      void qc.invalidateQueries({ queryKey: ["customer-photos", customer_id] });
      toast.success("Photo removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function useCustomerPayments(customerId: string) {
  return useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payments")
        .select("*").eq("customer_id", customerId)
        .order("payment_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Payment[];
    },
    enabled: !!customerId,
  });
}

// ─── Paint Shades ─────────────────────────────────────────────────────────────

export function useCustomerPaintShades(customerId: string) {
  return useQuery({
    queryKey: ["customer-paint-shades", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customer_paint_shades")
        .select("*").eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerPaintShade[];
    },
    enabled: !!customerId,
  });
}

// ─── House Mappings ───────────────────────────────────────────────────────────

export function useHouseMappings(customerId: string) {
  return useQuery({
    queryKey: ["house-mappings", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("house_mappings")
        .select("*").eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as HouseMapping[];
    },
    enabled: !!customerId,
  });
}

// ─── Customer Ledger (bills + payments combined, running balance) ──────────────

export interface LedgerEntry {
  id: string;
  date: string;
  type: "invoice" | "payment";
  billNumber?: string;
  billId?: string;
  invoiceTotal?: number;
  paidOnInvoice?: number;
  dueOnInvoice?: number;
  status?: string;
  paymentAmount?: number;
  method?: string;
  reference?: string | null;
  notes?: string | null;
  balance: number;
}

export function useCustomerLedger(customerId: string) {
  return useQuery<LedgerEntry[]>({
    queryKey: ["customer-ledger", customerId],
    queryFn: async () => {
      const [billsRes, paymentsRes] = await Promise.all([
        (supabase as any).from("bills")
          .select("id, bill_number, date, total, paid_amount, status")
          .eq("customer_id", customerId).order("date", { ascending: true }),
        (supabase as any).from("payments")
          .select("*").eq("customer_id", customerId)
          .order("payment_date", { ascending: true }),
      ]);

      type BillRow = { id: string; bill_number: string; date: string; total: number; paid_amount: number; status: string };
      const billEntries: LedgerEntry[] = ((billsRes.data ?? []) as BillRow[]).map((b) => ({
        id: b.id, date: b.date, type: "invoice",
        billId: b.id, billNumber: b.bill_number,
        invoiceTotal: b.total, paidOnInvoice: b.paid_amount,
        dueOnInvoice: b.total - b.paid_amount, status: b.status,
        balance: 0,
      }));

      const payEntries: LedgerEntry[] = ((paymentsRes.data ?? []) as Payment[]).map((p) => ({
        id: p.id, date: p.payment_date, type: "payment",
        paymentAmount: p.amount, method: p.payment_method,
        reference: p.reference, notes: p.notes,
        balance: 0,
      }));

      const entries = [...billEntries, ...payEntries].sort((a, b) => a.date.localeCompare(b.date));
      let balance = 0;
      for (const entry of entries) {
        balance += entry.type === "invoice" ? (entry.invoiceTotal ?? 0) : -(entry.paymentAmount ?? 0);
        entry.balance = balance;
      }
      return entries;
    },
    enabled: !!customerId,
  });
}

// ─── Customer Monthly Trend (last 6 months) ───────────────────────────────────

export interface CustomerMonthlyTrend {
  month: string;
  purchases: number;
  payments: number;
}

export function useCustomerMonthlyTrend(customerId: string) {
  return useQuery<CustomerMonthlyTrend[]>({
    queryKey: ["customer-monthly-trend", customerId],
    queryFn: async () => {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }) };
      });
      const start = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;

      const [billsRes, paymentsRes] = await Promise.all([
        (supabase as any).from("bills").select("date, total")
          .eq("customer_id", customerId).neq("status", "cancelled").gte("date", start),
        (supabase as any).from("payments").select("payment_date, amount")
          .eq("customer_id", customerId).gte("payment_date", start),
      ]);

      const billMap = new Map<string, number>();
      const payMap  = new Map<string, number>();

      for (const b of (billsRes.data ?? []) as { date: string; total: number }[]) {
        const d = new Date(b.date); const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        billMap.set(k, (billMap.get(k) ?? 0) + b.total);
      }
      for (const p of (paymentsRes.data ?? []) as { payment_date: string; amount: number }[]) {
        const d = new Date(p.payment_date); const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        payMap.set(k, (payMap.get(k) ?? 0) + p.amount);
      }

      return months.map(({ year, month, label }) => ({
        month: label,
        purchases: billMap.get(`${year}-${month}`) ?? 0,
        payments:  payMap.get(`${year}-${month}`) ?? 0,
      }));
    },
    enabled: !!customerId,
  });
}

// ─── Outstanding Bills (for record-payment dialog) ───────────────────────────

export interface CustomerOutstandingBill {
  id: string; bill_number: string; date: string;
  total: number; paid_amount: number; due: number; status: string;
}

export function useCustomerOutstandingBills(customerId: string) {
  return useQuery<CustomerOutstandingBill[]>({
    queryKey: ["customer-outstanding-bills", customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("id, bill_number, date, total, paid_amount, status")
        .eq("customer_id", customerId)
        .in("status", ["unpaid", "partially_paid", "sent", "overdue"])
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      type Row = { id: string; bill_number: string; date: string; total: number; paid_amount: number; status: string };
      return ((data ?? []) as Row[]).map((b) => ({ ...b, due: b.total - b.paid_amount }));
    },
    enabled: !!customerId,
  });
}

// ─── CRUD Mutations ───────────────────────────────────────────────────────────

export type CustomerInsert = Partial<Customer> & { name: string };
export type CustomerUpdate = Partial<Customer>;

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CustomerInsert) => {
      const { data, error } = await (supabase as any).from("customers").insert(values).select().single();
      if (error) throw new Error(error.message);
      return data as Customer;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CustomerUpdate }) => {
      const { data, error } = await (supabase as any).from("customers").update(values).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Customer;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["customer", data.id] });
      toast.success("Customer updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("customers").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
