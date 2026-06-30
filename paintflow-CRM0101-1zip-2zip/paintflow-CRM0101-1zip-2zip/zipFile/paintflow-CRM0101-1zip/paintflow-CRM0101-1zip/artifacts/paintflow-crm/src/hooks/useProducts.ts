import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";

// ─── Types ───────────────────────────────────────────────────

export type ProductWithStock = Product & {
  inventory: { quantity: number; min_quantity: number; reorder_level: number } | null;
};

export interface ProductFormValues {
  name: string;
  sku: string;
  brand: string;
  category: string;
  shade_number: string;
  shade_name: string;
  finish: string;
  pack_size: string;
  barcode: string;
  unit: string;
  hsn_code: string;
  gst_rate: number;
  purchase_price: number;
  price: number;
  description: string;
  is_active: boolean;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name:           "",
  sku:            "",
  brand:          "",
  category:       "",
  shade_number:   "",
  shade_name:     "",
  finish:         "",
  pack_size:      "",
  barcode:        "",
  unit:           "liter",
  hsn_code:       "",
  gst_rate:       18,
  purchase_price: 0,
  price:          0,
  description:    "",
  is_active:      true,
};

export const PAINT_CATEGORIES = [
  "Interior Paint",
  "Exterior Paint",
  "Primer",
  "Undercoat",
  "Enamel",
  "Distemper",
  "Waterproofing",
  "Wood Finish",
  "Metal Paint",
  "Putty",
  "Thinner",
  "Other",
] as const;

export const FINISH_TYPES = [
  "Matte",
  "Eggshell",
  "Satin",
  "Semi-Gloss",
  "Gloss",
  "Textured",
  "Metallic",
] as const;

export const PACK_SIZES = [
  "100ml",
  "200ml",
  "500ml",
  "1L",
  "2L",
  "4L",
  "10L",
  "20L",
] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const UNITS = [
  "liter",
  "kg",
  "unit",
  "piece",
  "bucket",
  "bag",
  "tin",
  "roll",
] as const;

export const PAGE_SIZE = 20;

// ─── Generate SKU ─────────────────────────────────────────────

export function generateSku(name: string, brand: string): string {
  const n = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const b = brand.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${b || "PRD"}${n ? "-" + n : ""}-${rand}`;
}

// ─── Hooks ───────────────────────────────────────────────────

export interface UseProductsParams {
  page: number;
  search: string;
  category: string;
  brand: string;
  isActive: "all" | "active" | "inactive";
}

export function useProducts(params: UseProductsParams) {
  const { page, search, category, brand, isActive } = params;
  return useQuery({
    queryKey: ["products", "list", page, search, category, brand, isActive],
    queryFn: async (): Promise<{ data: ProductWithStock[]; count: number }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("products")
        .select("*, inventory(quantity, min_quantity, reorder_level)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%,shade_number.ilike.%${search}%,barcode.ilike.%${search}%`
        );
      }
      if (category !== "all") query = query.eq("category", category);
      if (brand !== "all") query = query.eq("brand", brand);
      if (isActive === "active") query = query.eq("is_active", true);
      if (isActive === "inactive") query = query.eq("is_active", false);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((p: any) => {
        const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
        return { ...p, inventory: inv ?? null } as ProductWithStock;
      });
      return { data: rows, count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}

export function useProductFilterOptions() {
  return useQuery({
    queryKey: ["products", "filter-options"],
    queryFn: async (): Promise<{ categories: string[]; brands: string[] }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("products")
        .select("category, brand")
        .order("category");
      const rows = (data ?? []) as { category: string; brand: string | null }[];
      const categories = [...new Set(rows.map((r) => r.category))].filter(Boolean);
      const brands = [...new Set(rows.map((r) => r.brand).filter(Boolean))].filter(Boolean) as string[];
      return { categories, brands };
    },
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProductFormValues): Promise<Product> => {
      const sku = values.sku.trim() || generateSku(values.name, values.brand);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("products")
        .insert({
          name:           values.name.trim(),
          sku,
          brand:          values.brand.trim() || null,
          category:       values.category,
          shade_number:   values.shade_number.trim() || null,
          shade_name:     values.shade_name.trim() || null,
          finish:         values.finish || null,
          pack_size:      values.pack_size || null,
          barcode:        values.barcode.trim() || null,
          unit:           values.unit,
          hsn_code:       values.hsn_code.trim() || null,
          gst_rate:       values.gst_rate,
          purchase_price: values.purchase_price,
          price:          values.price,
          description:    values.description.trim() || null,
          is_active:      values.is_active,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Product;
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });
      toast.success(`Product "${p.name}" created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ProductFormValues;
    }): Promise<Product> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("products")
        .update({
          name:           values.name.trim(),
          sku:            values.sku.trim(),
          brand:          values.brand.trim() || null,
          category:       values.category,
          shade_number:   values.shade_number.trim() || null,
          shade_name:     values.shade_name.trim() || null,
          finish:         values.finish || null,
          pack_size:      values.pack_size || null,
          barcode:        values.barcode.trim() || null,
          unit:           values.unit,
          hsn_code:       values.hsn_code.trim() || null,
          gst_rate:       values.gst_rate,
          purchase_price: values.purchase_price,
          price:          values.price,
          description:    values.description.trim() || null,
          is_active:      values.is_active,
          updated_at:     new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Product;
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });
      toast.success(`Product "${p.name}" updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Product): Promise<Product> => {
      const newSku = generateSku(product.name, product.brand ?? "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("products")
        .insert({
          name:           `${product.name} (Copy)`,
          sku:            newSku,
          brand:          product.brand,
          category:       product.category,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shade_number:   (product as any).shade_number,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shade_name:     (product as any).shade_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          finish:         (product as any).finish,
          pack_size:      product.pack_size,
          barcode:        null, // barcodes must be unique
          unit:           product.unit,
          hsn_code:       product.hsn_code,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gst_rate:       (product as any).gst_rate ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          purchase_price: (product as any).purchase_price ?? 0,
          price:          product.price,
          description:    product.description,
          is_active:      true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Product;
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Product duplicated as "${p.name}"`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("products")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { is_active }) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product-search"] });
      toast.success(is_active ? "Product activated" : "Product deactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
