import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string;
  price: number;
  unit: string;
  description: string | null;
  pack_size: string | null;
  shade_name: string | null;
  shade_number: string | null;
  finish: string | null;
  is_active: boolean;
  // joined
  inventory?: { quantity: number }[] | null;
}

const SELECT =
  "id, name, sku, brand, category, price, unit, description, pack_size, shade_name, shade_number, finish, is_active, inventory(quantity)";

export function useStorefrontProducts() {
  return useQuery({
    queryKey: ["public", "products"],
    queryFn: async (): Promise<PublicProduct[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("products")
        .select(SELECT)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PublicProduct[];
    },
    staleTime: 60 * 1000,
  });
}

export function useStorefrontProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["public", "product", id],
    enabled: !!id,
    queryFn: async (): Promise<PublicProduct | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("products")
        .select(SELECT)
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as PublicProduct | null;
    },
    staleTime: 60 * 1000,
  });
}

// ── Stock helpers ────────────────────────────────────────────────────────

export function totalStock(p: PublicProduct): number {
  return (p.inventory ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
}

export type Availability = "in_stock" | "low_stock" | "out_of_stock";

export function availability(p: PublicProduct): Availability {
  const q = totalStock(p);
  if (q <= 0) return "out_of_stock";
  if (q <= 5) return "low_stock";
  return "in_stock";
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: "In stock",
  low_stock: "Limited stock",
  out_of_stock: "Out of stock",
};

export const AVAILABILITY_CLASS: Record<Availability, string> = {
  in_stock: "bg-green-100 text-green-700 border-green-200",
  low_stock: "bg-amber-100 text-amber-700 border-amber-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
};
