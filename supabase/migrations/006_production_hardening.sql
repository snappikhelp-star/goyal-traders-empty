-- ============================================================
-- PaintFlow CRM — Production Hardening
-- Run in Supabase SQL Editor AFTER 005_billing_extended.sql
-- ============================================================
-- This migration:
--   1. Adds missing phone / mobile indexes on customers
--   2. Adds missing updated_at trigger on shop_settings
--   3. Adds missing last_updated auto-trigger on inventory
--   4. Consolidates duplicate RLS policies (002 granular +
--      005 broad "auth all" overlap) into a clean, role-aware
--      set: staff/manager get full CRUD; only admin/manager
--      can hard-delete sensitive records.
--   5. Adds lower-case B-tree indexes on customers.name and
--      products.name for fast ILIKE prefix searches.
--   6. Adds created_at to shop_settings (was missing).
--   7. Adds a partial unique index on customers.gst_number.
-- ============================================================

-- ─── 1. Missing customer phone/mobile indexes ────────────────
-- Used by mobile lookups in the customer search bar.
CREATE INDEX IF NOT EXISTS customers_phone_idx
  ON public.customers (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS customers_alternate_mobile_idx
  ON public.customers (alternate_mobile)
  WHERE alternate_mobile IS NOT NULL;

-- Faster ILIKE prefix search on customer name (e.g. "Raj%")
CREATE INDEX IF NOT EXISTS customers_name_lower_idx
  ON public.customers (lower(name));

-- Faster ILIKE prefix search on product name
CREATE INDEX IF NOT EXISTS products_name_lower_idx
  ON public.products (lower(name));

-- Customer paint shades — shade_code lookup
CREATE INDEX IF NOT EXISTS customer_paint_shades_shade_code_idx
  ON public.customer_paint_shades (shade_code)
  WHERE shade_code IS NOT NULL;

-- Payments by date descending (useful for reports)
CREATE INDEX IF NOT EXISTS payments_date_created_idx
  ON public.payments (created_at DESC);

-- ─── 2. shop_settings — add missing created_at + trigger ────
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_updated_at_shop_settings ON public.shop_settings;
CREATE TRIGGER set_updated_at_shop_settings
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── 3. inventory — auto-refresh last_updated on every UPDATE
CREATE OR REPLACE FUNCTION public.set_inventory_last_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_updated := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_last_updated_inventory ON public.inventory;
CREATE TRIGGER set_last_updated_inventory
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE PROCEDURE public.set_inventory_last_updated();

-- ─── 4. Consolidate RLS policies ────────────────────────────
-- Migration 002 created granular policies (read/insert/update/
-- admin-delete) for bills, products, inventory, and bill_items.
-- Migration 005 then added broad "auth all" policies for the
-- same tables — silently overriding the admin-delete restriction
-- so any authenticated user could delete bills/products.
-- We remove the stale 002 granular policies and 005 broad
-- policies, then replace them with a single, clean role-aware
-- set per table.

-- ── bills ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "bills: auth read"    ON public.bills;
DROP POLICY IF EXISTS "bills: auth insert"  ON public.bills;
DROP POLICY IF EXISTS "bills: auth update"  ON public.bills;
DROP POLICY IF EXISTS "bills: admin delete" ON public.bills;
DROP POLICY IF EXISTS "bills: auth all"     ON public.bills;

CREATE POLICY "bills: read"
  ON public.bills FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "bills: insert"
  ON public.bills FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bills: update"
  ON public.bills FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bills: delete"
  ON public.bills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ── bill_items ─────────────────────────────────────────────
DROP POLICY IF EXISTS "bill_items: auth read"  ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: auth write" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: auth all"   ON public.bill_items;

CREATE POLICY "bill_items: read"
  ON public.bill_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "bill_items: insert"
  ON public.bill_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bill_items: update"
  ON public.bill_items FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bill_items: delete"
  ON public.bill_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ── products ───────────────────────────────────────────────
DROP POLICY IF EXISTS "products: auth read"    ON public.products;
DROP POLICY IF EXISTS "products: auth insert"  ON public.products;
DROP POLICY IF EXISTS "products: auth update"  ON public.products;
DROP POLICY IF EXISTS "products: admin delete" ON public.products;
DROP POLICY IF EXISTS "products: auth all"     ON public.products;

CREATE POLICY "products: read"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "products: insert"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: update"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: delete"
  ON public.products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ── inventory ──────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory: auth read"  ON public.inventory;
DROP POLICY IF EXISTS "inventory: auth write" ON public.inventory;
DROP POLICY IF EXISTS "inventory: auth all"   ON public.inventory;

CREATE POLICY "inventory: read"
  ON public.inventory FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "inventory: write"
  ON public.inventory FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── shop_settings ──────────────────────────────────────────
DROP POLICY IF EXISTS "shop_settings: auth read"   ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings: admin write" ON public.shop_settings;

CREATE POLICY "shop_settings: read"
  ON public.shop_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "shop_settings: admin write"
  ON public.shop_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ── customers ─────────────────────────────────────────────
-- Refresh to ensure WITH CHECK clauses are present
DROP POLICY IF EXISTS "customers: auth read"    ON public.customers;
DROP POLICY IF EXISTS "customers: auth insert"  ON public.customers;
DROP POLICY IF EXISTS "customers: auth update"  ON public.customers;
DROP POLICY IF EXISTS "customers: admin delete" ON public.customers;

CREATE POLICY "customers: read"
  ON public.customers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "customers: insert"
  ON public.customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customers: update"
  ON public.customers FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customers: delete"
  ON public.customers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ── profiles ──────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: own read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;

CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (needed for role checks)
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- ─── 5. Partial unique index on customers.gst_number ────────
CREATE UNIQUE INDEX IF NOT EXISTS customers_gst_number_idx
  ON public.customers (gst_number)
  WHERE gst_number IS NOT NULL AND gst_number <> '';

-- ─── 6. Ensure all RLS flags are set ────────────────────────
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_mappings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_paint_shades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
