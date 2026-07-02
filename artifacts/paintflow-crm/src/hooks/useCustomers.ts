import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { dbInsert, dbUpdate } from "@/lib/dbHelpers";
import type { Database } from "@/lib/database.types";
import type {
  Customer,
  CustomerNote,
  CustomerPhoto,
  HouseMapping,
  CustomerPaintShade,
  Payment,
  CustomerStats,
} from "@/types";

// ─── List with search / sort / paginate ─────────────────────

export type CustomerSortField =
  | "name"
  | "phone"
  | "city"
  | "created_at"
  | "last_purchase_date";

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
      let query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .order(sortField, { ascending: sortAsc, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search.trim()) {
        const s = search.trim();
        query = query.or(
          `name.ilike.%${s}%,phone.ilike.%${s}%,alternate_mobile.ilike.%${s}%,address.ilike.%${s}%,city.ilike.%${s}%`
        );
      }
      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      if (state.trim()) query = query.eq("state", state.trim());

      const { data, count, error } = await query;
      if (error) throw error;
      return { customers: (data ?? []) as Customer[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Single customer ─────────────────────────────────────────

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
}

// ─── Customer aggregate stats from bills ─────────────────────

export function useCustomerStats(id: string) {
  return useQuery<CustomerStats>({
    queryKey: ["customer-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("total, paid_amount, status, date")
        .eq("customer_id", id);
      if (error) throw error;

      const bills = (data ?? []) as { total: number; paid_amount: number; status: string; date: string }[];
      const nonCancelled  = bills.filter((b) => b.status !== "cancelled");
      const totalBills    = nonCancelled.length;
      const totalSpent    = nonCancelled.reduce((s, b) => s + b.total, 0);
      const pendingAmount = nonCancelled.reduce(
        (s, b) => s + Math.max(b.total - (b.paid_amount ?? 0), 0),
        0,
      );
      const totalPaid     = totalSpent - pendingAmount;
      const dates         = nonCancelled.map((b) => b.date).sort();

      return {
        totalBills,
        totalSpent,
        totalPaid,
        pendingAmount,
        firstPurchase: dates[0] ?? null,
        lastPurchase:  dates[dates.length - 1] ?? null,
      };
    },
    enabled: !!id,
  });
}

// ─── Bills / Purchase History ────────────────────────────────

export function useCustomerBills(customerId: string) {
  return useQuery({
    queryKey: ["customer-bills", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("customer_id", customerId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customerId,
  });
}

// ─── Notes ──────────────────────────────────────────────────

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notes")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerNote[];
    },
    enabled: !!customerId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_id, content }: { customer_id: string; content: string }) => {
      const { data, error } = await dbInsert("customer_notes", { customer_id, content });
      if (error) throw error;
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
      const { error } = await supabase.from("customer_notes").delete().eq("id", id);
      if (error) throw error;
      return customer_id;
    },
    onSuccess: (customer_id) => {
      void qc.invalidateQueries({ queryKey: ["customer-notes", customer_id] });
      toast.success("Note deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Photos ─────────────────────────────────────────────────

export function useCustomerPhotos(customerId: string) {
  return useQuery({
    queryKey: ["customer-photos", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_photos")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerPhoto[];
    },
    enabled: !!customerId,
  });
}

export function useAddPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customer_id,
      url,
      caption,
    }: { customer_id: string; url: string; caption?: string }) => {
      const { data, error } = await dbInsert("customer_photos", {
        customer_id,
        url,
        caption: caption ?? null,
      });
      if (error) throw error;
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
      const { error } = await supabase.from("customer_photos").delete().eq("id", id);
      if (error) throw error;
      return customer_id;
    },
    onSuccess: (customer_id) => {
      void qc.invalidateQueries({ queryKey: ["customer-photos", customer_id] });
      toast.success("Photo removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Payments ───────────────────────────────────────────────

export function useCustomerPayments(customerId: string) {
  return useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, bill:bills(bill_number)")
        .eq("customer_id", customerId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: !!customerId,
  });
}

// ─── Paint Shades ────────────────────────────────────────────

export function useCustomerPaintShades(customerId: string) {
  return useQuery({
    queryKey: ["customer-paint-shades", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_paint_shades")
        .select("*")
        .eq("customer_id", customerId)
        .order("applied_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CustomerPaintShade[];
    },
    enabled: !!customerId,
  });
}

// ─── House Mappings ──────────────────────────────────────────

export function useHouseMappings(customerId: string) {
  return useQuery({
    queryKey: ["house-mappings", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("house_mappings")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HouseMapping[];
    },
    enabled: !!customerId,
  });
}

// ─── Customer Ledger (bills + payments combined, running balance) ────────────

export interface LedgerEntry {
  id: string;
  date: string;
  type: "invoice" | "payment";
  // invoice fields
  billNumber?: string;
  billId?: string;
  invoiceTotal?: number;
  paidOnInvoice?: number;
  dueOnInvoice?: number;
  status?: string;
  // payment fields
  paymentAmount?: number;
  method?: string;
  reference?: string | null;
  notes?: string | null;
  // shared
  balance: number; // running balance (positive = customer owes)
}

export function useCustomerLedger(customerId: string) {
  return useQuery<LedgerEntry[]>({
    queryKey: ["customer-ledger", customerId],
    queryFn: async () => {
      // Fetch non-cancelled bills first so we know which bill IDs are valid
      const billsRes = await supabase
        .from("bills")
        .select("id, bill_number, date, total, paid_amount, status")
        .eq("customer_id", customerId)
        .neq("status", "cancelled")
        .order("date", { ascending: true });

      if (billsRes.error) throw billsRes.error;

      // Only include payments that are linked to non-cancelled bills (or are unlinked / advance)
      const validBillIds = new Set(
        ((billsRes.data ?? []) as { id: string }[]).map((b) => b.id)
      );

      const paymentsRes = await supabase
        .from("payments")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("id, payment_date, amount, payment_method, reference, notes, bill_id, bill:bills(bill_number)" as any)
        .eq("customer_id", customerId)
        .order("payment_date", { ascending: true });

      if (paymentsRes.error) throw paymentsRes.error;

      type BillRow = { id: string; bill_number: string; date: string; total: number; paid_amount: number; status: string };
      type PayRow  = { id: string; payment_date: string; amount: number; payment_method: string; reference: string | null; notes: string | null; bill_id: string | null; bill: { bill_number: string } | { bill_number: string }[] | null };

      // Filter payments: include those linked to a valid (non-cancelled) bill OR unlinked (advance/general)
      const filteredPayments = ((paymentsRes.data ?? []) as PayRow[]).filter(
        (p) => p.bill_id === null || validBillIds.has(p.bill_id)
      );

      const combined: Array<{ date: string; tiebreak: number; type: "invoice" | "payment"; data: BillRow | PayRow }> = [
        ...((billsRes.data ?? []) as BillRow[]).map((b) => ({ date: b.date, tiebreak: 0, type: "invoice" as const, data: b })),
        ...filteredPayments.map((p) => ({ date: p.payment_date, tiebreak: 1, type: "payment" as const, data: p })),
      ];

      combined.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return a.tiebreak - b.tiebreak;
      });

      let balance = 0;
      return combined.map((e): LedgerEntry => {
        if (e.type === "invoice") {
          const b = e.data as BillRow;
          balance += b.total;
          return {
            id: b.id,
            date: b.date,
            type: "invoice",
            billNumber: b.bill_number,
            billId: b.id,
            invoiceTotal: b.total,
            paidOnInvoice: b.paid_amount,
            dueOnInvoice: Math.max(b.total - (b.paid_amount ?? 0), 0),
            status: b.status,
            balance,
          };
        } else {
          const p = e.data as PayRow;
          balance -= p.amount;
          const bill = Array.isArray(p.bill) ? (p.bill[0] ?? null) : p.bill;
          return {
            id: p.id,
            date: p.payment_date,
            type: "payment",
            paymentAmount: p.amount,
            method: p.payment_method,
            reference: p.reference,
            notes: p.notes,
            billNumber: bill?.bill_number ?? undefined,
            billId: p.bill_id ?? undefined,
            balance,
          };
        }
      });
    },
    enabled: !!customerId,
  });
}

// ─── Customer Monthly Trend (last 6 months) ──────────────────

export interface CustomerMonthlyTrend {
  month: string; // "Jan '25"
  purchases: number;
  payments: number;
}

export function useCustomerMonthlyTrend(customerId: string) {
  return useQuery<CustomerMonthlyTrend[]>({
    queryKey: ["customer-monthly-trend", customerId],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startDate = sixMonthsAgo.toISOString().split("T")[0];

      const [billsRes, paymentsRes] = await Promise.all([
        supabase
          .from("bills")
          .select("date, total")
          .eq("customer_id", customerId)
          .gte("date", startDate)
          .neq("status", "cancelled"),
        supabase
          .from("payments")
          .select("payment_date, amount")
          .eq("customer_id", customerId)
          .gte("payment_date", startDate),
      ]);

      if (billsRes.error) throw billsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      const months: (CustomerMonthlyTrend & { key: string })[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          month: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
          purchases: 0,
          payments: 0,
        };
      });

      for (const b of (billsRes.data ?? []) as { date: string; total: number }[]) {
        const key = b.date.slice(0, 7);
        const m = months.find((x) => x.key === key);
        if (m) m.purchases += b.total;
      }
      for (const p of (paymentsRes.data ?? []) as { payment_date: string; amount: number }[]) {
        const key = p.payment_date.slice(0, 7);
        const m = months.find((x) => x.key === key);
        if (m) m.payments += p.amount;
      }

      return months.map(({ key: _k, ...rest }) => rest);
    },
    enabled: !!customerId,
  });
}

// ─── Customer Outstanding Bills (for record-payment dialog) ──

export interface CustomerOutstandingBill {
  id: string;
  bill_number: string;
  date: string;
  total: number;
  paid_amount: number;
  due: number;
  status: string;
}

export function useCustomerOutstandingBills(customerId: string) {
  return useQuery<CustomerOutstandingBill[]>({
    queryKey: ["customer-outstanding-bills", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("id, bill_number, date, total, paid_amount, status")
        .eq("customer_id", customerId)
        .in("status", ["unpaid", "partially_paid", "overdue", "sent"])
        .order("date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as { id: string; bill_number: string; date: string; total: number; paid_amount: number; status: string }[]).map((b) => ({
        ...b,
        due: Math.max(b.total - (b.paid_amount ?? 0), 0),
      }));
    },
    enabled: !!customerId,
  });
}

// ─── CRUD Mutations ──────────────────────────────────────────

export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CustomerInsert) => {
      const { data, error } = await dbInsert("customers", values);
      if (error) throw error;
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
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: CustomerUpdate;
    }) => {
      const { data, error } = await dbUpdate("customers", id, values);
      if (error) throw error;
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
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
