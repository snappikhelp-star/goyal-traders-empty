-- ============================================================
-- PaintFlow CRM — Products & Inventory Extended Schema
-- Run in Supabase SQL Editor AFTER 007_invoice_rpc.sql
--
-- This migration:
--   1. Extends products table with paint-specific fields
--   2. Adds soft-delete (is_active) support to products
--   3. Extends inventory with reserved_quantity & reorder_level
--   4. Creates inventory_transactions table for movement history
--   5. Creates record_stock_movement() RPC for atomic stock ops
--   6. Grants / RLS policies for new table
-- ============================================================


-- ─── 1. Products extensions ───────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shade_name     text,
  ADD COLUMN IF NOT EXISTS finish         text,
  ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) NOT NULL DEFAULT 0
    CHECK (purchase_price >= 0),
  ADD COLUMN IF NOT EXISTS gst_rate       numeric(5,2)  NOT NULL DEFAULT 0
    CHECK (gst_rate >= 0 AND gst_rate <= 100),
  ADD COLUMN IF NOT EXISTS is_active      boolean NOT NULL DEFAULT true;

-- Index: fast listing of active products (billing search, catalog)
CREATE INDEX IF NOT EXISTS products_is_active_idx
  ON public.products (is_active)
  WHERE is_active = true;

-- Index: GST rate grouping (tax reports)
CREATE INDEX IF NOT EXISTS products_gst_rate_idx
  ON public.products (gst_rate);

-- Full-text index for shade-name search
CREATE INDEX IF NOT EXISTS products_shade_name_idx
  ON public.products (shade_name)
  WHERE shade_name IS NOT NULL;

-- Index: finish filter
CREATE INDEX IF NOT EXISTS products_finish_idx
  ON public.products (finish)
  WHERE finish IS NOT NULL;


-- ─── 2. Inventory extensions ──────────────────────────────────

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS reserved_quantity numeric(12,3) NOT NULL DEFAULT 0
    CHECK (reserved_quantity >= 0),
  ADD COLUMN IF NOT EXISTS reorder_level     numeric(12,3) NOT NULL DEFAULT 0
    CHECK (reorder_level >= 0);

-- Index: fast lookup of items at/below reorder level (alerts)
CREATE INDEX IF NOT EXISTS inventory_low_stock_idx
  ON public.inventory (quantity, min_quantity)
  WHERE quantity <= min_quantity;


-- ─── 3. Inventory Transactions ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       uuid        NOT NULL
                               REFERENCES public.products(id) ON DELETE CASCADE,
  transaction_type text        NOT NULL
                               CHECK (transaction_type IN (
                                 'stock_in', 'stock_out', 'adjustment', 'sale', 'return'
                               )),
  quantity_change  numeric(12,3) NOT NULL,
  quantity_before  numeric(12,3) NOT NULL CHECK (quantity_before >= 0),
  quantity_after   numeric(12,3) NOT NULL CHECK (quantity_after  >= 0),
  reference_type   text,
  reference_id     uuid,
  notes            text,
  performed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for inventory transactions
CREATE INDEX IF NOT EXISTS inv_tx_product_created_idx
  ON public.inventory_transactions (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inv_tx_type_idx
  ON public.inventory_transactions (transaction_type);

CREATE INDEX IF NOT EXISTS inv_tx_reference_idx
  ON public.inventory_transactions (reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inv_tx_created_at_idx
  ON public.inventory_transactions (created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_tx: auth all" ON public.inventory_transactions;

CREATE POLICY "inv_tx: auth all"
  ON public.inventory_transactions FOR ALL
  USING  (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 4. record_stock_movement() RPC ──────────────────────────
--
-- Atomically:
--   a. Locks the inventory row (prevents race conditions)
--   b. Validates sufficient stock for stock_out
--   c. Updates inventory.quantity
--   d. Inserts a row in inventory_transactions
--   e. Returns new quantity stats
--
-- For 'adjustment', p_quantity_change is the DELTA (can be negative).
-- Caller is responsible for computing the correct delta.

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_id     uuid,
  p_type           text,
  p_quantity_change numeric(12,3),
  p_notes          text    DEFAULT NULL,
  p_reference_type text    DEFAULT NULL,
  p_reference_id   uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_qty_before numeric(12,3);
  v_qty_after  numeric(12,3);
BEGIN
  -- ── Auth check ─────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Must be signed in to record stock movement'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Validate type ──────────────────────────────────────────
  IF p_type NOT IN ('stock_in', 'stock_out', 'adjustment', 'sale', 'return') THEN
    RAISE EXCEPTION 'VALIDATION: Invalid transaction_type "%"', p_type
      USING ERRCODE = 'P0002';
  END IF;

  -- ── Lock and read current quantity ─────────────────────────
  SELECT quantity INTO v_qty_before
  FROM public.inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY: No inventory record found for this product. Create the product first.'
      USING ERRCODE = 'P0003';
  END IF;

  -- ── Compute new quantity ───────────────────────────────────
  v_qty_after := v_qty_before + p_quantity_change;

  IF v_qty_after < 0 THEN
    RAISE EXCEPTION 'STOCK: Insufficient stock. Available: %, requested out: %',
      v_qty_before, ABS(p_quantity_change)
      USING ERRCODE = 'P0004';
  END IF;

  -- ── Update inventory ───────────────────────────────────────
  UPDATE public.inventory
  SET quantity     = v_qty_after,
      last_updated = now()
  WHERE product_id = p_product_id;

  -- ── Record transaction ─────────────────────────────────────
  INSERT INTO public.inventory_transactions (
    product_id,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    reference_type,
    reference_id,
    notes,
    performed_by
  ) VALUES (
    p_product_id,
    p_type,
    p_quantity_change,
    v_qty_before,
    v_qty_after,
    p_reference_type,
    p_reference_id,
    p_notes,
    v_user_id
  );

  RETURN jsonb_build_object(
    'success',          true,
    'quantity_before',  v_qty_before,
    'quantity_after',   v_qty_after,
    'quantity_change',  p_quantity_change
  );

EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'VALIDATION: Quantity cannot go below zero.'
      USING ERRCODE = 'P0004';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, numeric, text, text, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.record_stock_movement IS
  'Atomically records a stock movement (stock_in, stock_out, adjustment, sale, return). '
  'Locks the inventory row, validates, updates quantity, and inserts an inventory_transactions row. '
  'Rolls back on any error.';
