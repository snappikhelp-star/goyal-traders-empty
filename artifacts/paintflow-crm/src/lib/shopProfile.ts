import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Centralized Shop Profile for GOYAL TRADERS.
 *
 * This single source of truth feeds the Login page, Sidebar, Dashboard,
 * Invoice / PDF / Print pages, and Reports. Values from the Supabase
 * `shop_settings` table override these defaults when present.
 */

export interface ShopProfile {
  shop_name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string | null;
  gstin: string;
  tax_rate: number;
  currency: string;
  logo_url: string;
  tagline: string;
}

export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shop_name: "GOYAL TRADERS",
  owner_name: "Ankit Jain",
  address: "Main Road, Salamatpur, Madhya Pradesh",
  phone: "+91 7000683658",
  email: null,
  gstin: "23DILPG8222E1ZL",
  tax_rate: 18,
  currency: "INR",
  logo_url: "/goyal-traders-logo.png",
  tagline: "Paints, Sanitary & Plumbing Store",
};

/**
 * Loads shop settings from Supabase and merges them with the centralized
 * GOYAL TRADERS defaults. Never throws — if Supabase is unreachable or the
 * row is missing, the static defaults are returned so the UI always renders
 * correct branding.
 */
export function useShopProfile() {
  const query = useQuery({
    queryKey: ["shop-profile"],
    queryFn: async (): Promise<Partial<ShopProfile>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("shop_settings")
        .select("*")
        .maybeSingle();
      if (error) return {};
      if (!data) return {};
      return {
        shop_name:  data.shop_name  || undefined,
        address:    data.address    || undefined,
        phone:      data.phone      || undefined,
        email:      data.email      || undefined,
        gstin:      data.tax_number || undefined,
        tax_rate:   data.tax_rate   ?? undefined,
        currency:   data.currency   || undefined,
        logo_url:   data.logo_url   || undefined,
        // owner_name & tagline are not in the DB schema yet — kept on defaults.
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const profile: ShopProfile = {
    ...DEFAULT_SHOP_PROFILE,
    ...(query.data ?? {}),
  };

  return { profile, isLoading: query.isLoading };
}
