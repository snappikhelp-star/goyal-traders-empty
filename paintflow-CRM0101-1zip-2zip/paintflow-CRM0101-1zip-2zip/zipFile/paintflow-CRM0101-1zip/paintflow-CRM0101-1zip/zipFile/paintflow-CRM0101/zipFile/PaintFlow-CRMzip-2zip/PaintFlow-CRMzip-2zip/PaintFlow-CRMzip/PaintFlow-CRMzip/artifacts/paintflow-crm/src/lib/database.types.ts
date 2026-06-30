export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "admin" | "manager" | "staff";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "manager" | "staff";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "manager" | "staff";
          updated_at?: string;
        };
      };
      shop_settings: {
        Row: {
          id: number;
          shop_name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          tax_number: string | null;
          tax_rate: number;
          currency: string;
          logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop_name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          tax_number?: string | null;
          tax_rate?: number;
          currency?: string;
          logo_url?: string | null;
          updated_at?: string;
        };
        Update: {
          shop_name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          tax_number?: string | null;
          tax_rate?: number;
          currency?: string;
          logo_url?: string | null;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          alternate_mobile: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          gst_number: string | null;
          birthday: string | null;
          anniversary: string | null;
          notes: string | null;
          last_purchase_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          alternate_mobile?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          gst_number?: string | null;
          birthday?: string | null;
          anniversary?: string | null;
          notes?: string | null;
          last_purchase_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          alternate_mobile?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          gst_number?: string | null;
          birthday?: string | null;
          anniversary?: string | null;
          notes?: string | null;
          last_purchase_date?: string | null;
          updated_at?: string;
        };
      };
      customer_notes: {
        Row: {
          id: string;
          customer_id: string;
          content: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          content: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      customer_photos: {
        Row: {
          id: string;
          customer_id: string;
          url: string;
          caption: string | null;
          house_mapping_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          url: string;
          caption?: string | null;
          house_mapping_id?: string | null;
          created_at?: string;
        };
        Update: {
          url?: string;
          caption?: string | null;
          house_mapping_id?: string | null;
        };
      };
      house_mappings: {
        Row: {
          id: string;
          customer_id: string;
          property_name: string;
          address: string | null;
          property_type: "residential" | "commercial" | "office" | "shop" | "other";
          area_sqft: number | null;
          rooms: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          property_name: string;
          address?: string | null;
          property_type?: "residential" | "commercial" | "office" | "shop" | "other";
          area_sqft?: number | null;
          rooms?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          property_name?: string;
          address?: string | null;
          property_type?: "residential" | "commercial" | "office" | "shop" | "other";
          area_sqft?: number | null;
          rooms?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      customer_paint_shades: {
        Row: {
          id: string;
          customer_id: string;
          house_mapping_id: string | null;
          brand: string | null;
          shade_name: string;
          shade_code: string | null;
          room_area: string | null;
          applied_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          house_mapping_id?: string | null;
          brand?: string | null;
          shade_name: string;
          shade_code?: string | null;
          room_area?: string | null;
          applied_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          house_mapping_id?: string | null;
          brand?: string | null;
          shade_name?: string;
          shade_code?: string | null;
          room_area?: string | null;
          applied_date?: string | null;
          notes?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          customer_id: string;
          bill_id: string | null;
          amount: number;
          payment_method: "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";
          payment_date: string;
          reference: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          bill_id?: string | null;
          amount: number;
          payment_method?: "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";
          payment_date?: string;
          reference?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          payment_method?: "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";
          payment_date?: string;
          reference?: string | null;
          notes?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          sku: string;
          brand: string | null;
          color: string | null;
          category: string;
          price: number;
          unit: string;
          description: string | null;
          barcode: string | null;
          shade_number: string | null;
          pack_size: string | null;
          hsn_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku: string;
          brand?: string | null;
          color?: string | null;
          category: string;
          price: number;
          unit?: string;
          description?: string | null;
          barcode?: string | null;
          shade_number?: string | null;
          pack_size?: string | null;
          hsn_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sku?: string;
          brand?: string | null;
          color?: string | null;
          category?: string;
          price?: number;
          unit?: string;
          description?: string | null;
          barcode?: string | null;
          shade_number?: string | null;
          pack_size?: string | null;
          hsn_code?: string | null;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          min_quantity: number;
          location: string | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          min_quantity?: number;
          location?: string | null;
          last_updated?: string;
        };
        Update: {
          quantity?: number;
          min_quantity?: number;
          location?: string | null;
          last_updated?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          customer_id: string;
          bill_number: string;
          date: string;
          due_date: string | null;
          status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
          subtotal: number;
          discount: number;
          tax_rate: number;
          tax: number;
          total: number;
          paid_amount: number;
          payment_method: "cash" | "upi" | "card" | "credit" | "bank_transfer" | "cheque";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          bill_number?: string;
          date?: string;
          due_date?: string | null;
          status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
          subtotal?: number;
          discount?: number;
          tax_rate?: number;
          tax?: number;
          total?: number;
          paid_amount?: number;
          payment_method?: "cash" | "upi" | "card" | "credit" | "bank_transfer" | "cheque";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          date?: string;
          due_date?: string | null;
          status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
          tax_rate?: number;
          paid_amount?: number;
          payment_method?: "cash" | "upi" | "card" | "credit" | "bank_transfer" | "cheque";
          notes?: string | null;
          updated_at?: string;
        };
      };
      bill_items: {
        Row: {
          id: string;
          bill_id: string;
          product_id: string;
          product_name: string | null;
          brand: string | null;
          shade_number: string | null;
          pack_size: string | null;
          quantity: number;
          unit_price: number;
          discount: number;
          gst_rate: number;
          gst_amount: number;
          total: number;
        };
        Insert: {
          id?: string;
          bill_id: string;
          product_id: string;
          product_name?: string | null;
          brand?: string | null;
          shade_number?: string | null;
          pack_size?: string | null;
          quantity: number;
          unit_price: number;
          discount?: number;
          gst_rate?: number;
          gst_amount?: number;
          total?: number;
        };
        Update: {
          product_id?: string;
          product_name?: string | null;
          brand?: string | null;
          shade_number?: string | null;
          pack_size?: string | null;
          quantity?: number;
          unit_price?: number;
          discount?: number;
          gst_rate?: number;
          gst_amount?: number;
          total?: number;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
}
