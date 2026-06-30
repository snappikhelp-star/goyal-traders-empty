import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type Company = {
  id: string;
  name: string;
  brand: "JSW Paints" | "Birla Opus" | "Other" | null;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  credit_limit: number;
  payment_terms_days: number;
  opening_due: number;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type CompanyInsert = Omit<Company, "id" | "created_at" | "updated_at">;
export type CompanyUpdate = Partial<CompanyInsert>;

export type CompanySortField = "name" | "brand" | "status" | "credit_limit" | "created_at";

interface UseCompaniesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: CompanySortField;
  sortAsc?: boolean;
  brand?: string;
  status?: string;
}

const QUERY_KEY = "companies";

export function useCompanies({
  search = "",
  page = 1,
  pageSize = 15,
  sortField = "name",
  sortAsc = true,
  brand = "",
  status = "",
}: UseCompaniesOptions = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, { search, page, pageSize, sortField, sortAsc, brand, status }],
    queryFn: async () => {
      let query = supabase
        .from("companies" as never)
        .select("*", { count: "exact" });

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,contact_person.ilike.%${search}%,mobile.ilike.%${search}%,gstin.ilike.%${search}%`
        );
      }
      if (brand) query = query.eq("brand", brand);
      if (status) query = query.eq("status", status);

      query = query.order(sortField, { ascending: sortAsc });

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { companies: (data ?? []) as Company[], total: count ?? 0 };
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as never)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CompanyInsert) => {
      const { data, error } = await supabase
        .from("companies" as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Company added successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to add company");
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: CompanyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("companies" as never)
        .update(payload as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Company updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update company");
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("companies" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Company deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete company");
    },
  });
}
