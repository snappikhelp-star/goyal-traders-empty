import type { Database } from "@/lib/database.types";

export type { Database } from "@/lib/database.types";

export type Profile              = Database["public"]["Tables"]["profiles"]["Row"];
export type ShopSettings         = Database["public"]["Tables"]["shop_settings"]["Row"];
export type Customer             = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerNote         = Database["public"]["Tables"]["customer_notes"]["Row"];
export type CustomerPhoto        = Database["public"]["Tables"]["customer_photos"]["Row"];
export type HouseMapping         = Database["public"]["Tables"]["house_mappings"]["Row"];
export type CustomerPaintShade   = Database["public"]["Tables"]["customer_paint_shades"]["Row"];
export type Payment              = Database["public"]["Tables"]["payments"]["Row"] & {
  bill?: { bill_number: string } | null;
};
export type Product              = Database["public"]["Tables"]["products"]["Row"];
export type InventoryItem        = Database["public"]["Tables"]["inventory"]["Row"] & {
  product?: Product;
};
export type BillStatus = Database["public"]["Tables"]["bills"]["Row"]["status"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"] & {
  customer?: Customer;
  items?: BillItem[];
};
export type BillItem = Database["public"]["Tables"]["bill_items"]["Row"] & {
  product?: Product;
};

export interface DashboardStats {
  total_customers: number;
  total_products: number;
  total_bills: number;
  revenue_this_month: number;
  pending_bills: number;
  low_stock_items: number;
}

export interface CustomerStats {
  totalBills: number;
  totalSpent: number;
  pendingAmount: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;
