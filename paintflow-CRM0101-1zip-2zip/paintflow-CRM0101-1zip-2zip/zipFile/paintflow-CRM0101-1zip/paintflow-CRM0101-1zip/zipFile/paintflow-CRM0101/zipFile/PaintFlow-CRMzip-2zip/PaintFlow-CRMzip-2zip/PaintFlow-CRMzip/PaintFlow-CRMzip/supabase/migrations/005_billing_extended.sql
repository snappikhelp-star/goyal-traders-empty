-- ============================================================
-- PaintFlow CRM — Billing Extended Schema
-- Run in Supabase SQL Editor AFTER 004_customer_last_purchase.sql
-- ============================================================

-- ─── Extend products table ──────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode      text,
  ADD COLUMN IF NOT EXISTS shade_number text,
  ADD COLUMN IF NOT EXISTS pack_size    text,
  ADD COLUMN IF NOT EXISTS hsn_code     text;

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_idx
  ON public.products (barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_shade_number_idx
  ON public.products (shade_number) WHERE shade_number IS NOT NULL;

-- ─── Extend bill_items table ────────────────────────────────
-- The existing total column is GENERATED ALWAYS AS (quantity*unit_price) STORED.
-- PostgreSQL does not allow altering generated columns, so we must drop and re-add.
ALTER TABLE public.bill_items DROP COLUMN IF EXISTS total;

ALTER TABLE public.bill_items
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS brand        text,
  ADD COLUMN IF NOT EXISTS shade_number text,
  ADD COLUMN IF NOT EXISTS pack_size    text,
  ADD COLUMN IF NOT EXISTS discount     numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  ADD COLUMN IF NOT EXISTS gst_rate     numeric(5,2)  NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  ADD COLUMN IF NOT EXISTS gst_amount   numeric(12,2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  ADD COLUMN IF NOT EXISTS total        numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0);

-- ─── Extend bills table ─────────────────────────────────────
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS discount       numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  ADD COLUMN IF NOT EXISTS paid_amount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'upi', 'card', 'credit', 'bank_transfer', 'cheque'));

-- ─── Update recalculate_bill_totals trigger ─────────────────
-- Now sums per-item discount, GST amounts, and pre-computed item totals.
CREATE OR REPLACE FUNCTION public.recalculate_bill_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bill_id  uuid;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_tax      numeric(12,2);
  v_total    numeric(12,2);
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

  SELECT
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(COALESCE(discount,    0)), 0),
    COALESCE(SUM(COALESCE(gst_amount,  0)), 0),
    COALESCE(SUM(COALESCE(total,       0)), 0)
  INTO v_subtotal, v_discount, v_tax, v_total
  FROM public.bill_items
  WHERE bill_id = v_bill_id;

  UPDATE public.bills
  SET subtotal   = v_subtotal,
      discount   = v_discount,
      tax        = v_tax,
      total      = v_total,
      updated_at = now()
  WHERE id = v_bill_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── RLS on bills and bill_items ─────────────────────────────
ALTER TABLE public.bills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills: auth all"      ON public.bills;
DROP POLICY IF EXISTS "bill_items: auth all" ON public.bill_items;
DROP POLICY IF EXISTS "products: auth all"   ON public.products;
DROP POLICY IF EXISTS "inventory: auth all"  ON public.inventory;

CREATE POLICY "bills: auth all"
  ON public.bills FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bill_items: auth all"
  ON public.bill_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: auth all"
  ON public.products FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory: auth all"
  ON public.inventory FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
