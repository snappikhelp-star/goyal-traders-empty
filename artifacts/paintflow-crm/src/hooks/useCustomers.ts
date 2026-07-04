import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, buildQuery } from "@/lib/api";
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
      const qs = buildQuery({
        search,
        page,
        pageSize,
        sortField,
        sortAsc,
        city,
        state,
      });
      return api.get<{ customers: Customer[]; total: number }>(`/customers${qs}`);
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Single customer ─────────────────────────────────────────

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

// ─── Customer aggregate stats from bills ─────────────────────

export function useCustomerStats(id: string) {
  return useQuery<CustomerStats>({
    queryKey: ["customer-stats", id],
    queryFn: async () => api.get<CustomerStats>(`/customers/${id}/stats`),
    enabled: !!id,
  });
}

// ─── Bills / Purchase History ────────────────────────────────

export function useCustomerBills(customerId: string) {
  return useQuery({
    queryKey: ["customer-bills", customerId],
    queryFn: async () => api.get(`/customers/${customerId}/bills`),
    enabled: !!customerId,
  });
}

// ─── Notes ──────────────────────────────────────────────────

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: async () => api.get<CustomerNote[]>(`/customers/${customerId}/notes`),
    enabled: !!customerId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customer_id, content }: { customer_id: string; content: string }) =>
      api.post<CustomerNote>(`/customers/${customer_id}/notes`, { content }),
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
      await api.delete(`/customers/${customer_id}/notes/${id}`);
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
    queryFn: async () => api.get<CustomerPhoto[]>(`/customers/${customerId}/photos`),
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
    }: { customer_id: string; url: string; caption?: string }) =>
      api.post<CustomerPhoto>(`/customers/${customer_id}/photos`, {
        url,
        caption: caption ?? null,
      }),
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
      await api.delete(`/customers/${customer_id}/photos/${id}`);
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
    queryFn: async () => api.get<Payment[]>(`/payments${buildQuery({ customerId })}`),
    enabled: !!customerId,
  });
}

// ─── Paint Shades ────────────────────────────────────────────

export function useCustomerPaintShades(customerId: string) {
  return useQuery({
    queryKey: ["customer-paint-shades", customerId],
    queryFn: async () => api.get<CustomerPaintShade[]>(`/customers/${customerId}/paint-shades`),
    enabled: !!customerId,
  });
}

// ─── House Mappings ──────────────────────────────────────────

export function useHouseMappings(customerId: string) {
  return useQuery({
    queryKey: ["house-mappings", customerId],
    queryFn: async () => api.get<HouseMapping[]>(`/customers/${customerId}/house-mappings`),
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
    queryFn: async () => api.get<LedgerEntry[]>(`/customers/${customerId}/ledger`),
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
    queryFn: async () => api.get<CustomerMonthlyTrend[]>(`/customers/${customerId}/monthly-trend`),
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
    queryFn: async () => api.get<CustomerOutstandingBill[]>(`/customers/${customerId}/outstanding-bills`),
    enabled: !!customerId,
  });
}

// ─── CRUD Mutations ──────────────────────────────────────────

export type CustomerInsert = Partial<Customer> & { name: string };
export type CustomerUpdate = Partial<Customer>;

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CustomerInsert) => api.post<Customer>("/customers", values),
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
    }) => api.put<Customer>(`/customers/${id}`, values),
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
      await api.delete(`/customers/${id}`);
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
