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
        .select("total, status, date")
        .eq("customer_id", id);
      if (error) throw error;

      const bills = (data ?? []) as { total: number; status: string; date: string }[];
      const totalBills = bills.length;
      const totalSpent = bills.reduce((s, b) => s + b.total, 0);
      const pendingAmount = bills
        .filter((b) => b.status !== "paid" && b.status !== "cancelled")
        .reduce((s, b) => s + b.total, 0);
      const dates = bills.map((b) => b.date).sort();

      return {
        totalBills,
        totalSpent,
        pendingAmount,
        firstPurchase: dates[0] ?? null,
        lastPurchase: dates[dates.length - 1] ?? null,
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
