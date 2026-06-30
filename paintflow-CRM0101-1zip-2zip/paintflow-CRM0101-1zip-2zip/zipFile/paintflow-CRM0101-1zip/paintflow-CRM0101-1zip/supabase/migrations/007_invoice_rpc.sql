-- ============================================================
-- PaintFlow CRM — Transactional Invoice RPC
-- Run in Supabase SQL Editor AFTER 006_production_hardening.sql
--
-- This migration:
--   1. Adds customer lifetime-value columns:
--        total_purchase_amount, total_purchase_count, pending_balance
--   2. Extends bills.status to include 'partially_paid' and 'unpaid'.
--   3. Creates an audit_logs table for all write operations.
--   4. Creates the create_invoice() SECURITY DEFINER RPC that
--      atomically:
--        • Validates auth + inputs
--        • Locks inventory rows and prevents negative stock
--        • Generates bill_number via existing trigger
--        • Creates bill header (auto-derives status from payment)
--        • Creates all bill_items
--        • Deducts inventory (CHECK constraint as safety net)
--        • Stores paint shade history for shaded items
--        • Updates customer statistics + last_purchase_date
--        • Creates payment record if paid_amount > 0
--        • Writes an audit log entry
--        • Rolls back EVERYTHING automatically on any error
--   5. Grants EXECUTE to authenticated role.
-- ============================================================


-- ─── 1. Customer lifetime-value columns ──────────────────────

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_purchase_amount numeric(14,2) NOT NULL DEFAULT 0
    CHECK (total_purchase_amount >= 0),
  ADD COLUMN IF NOT EXISTS total_purchase_count  integer       NOT NULL DEFAULT 0
    CHECK (total_purchase_count  >= 0),
  ADD COLUMN IF NOT EXISTS pending_balance       numeric(14,2) NOT NULL DEFAULT 0;

-- Index: fast lookup of customers with an outstanding balance
CREATE INDEX IF NOT EXISTS customers_pending_balance_idx
  ON public.customers (pending_balance)
  WHERE pending_balance > 0;

-- Index: sort/filter by total spend (VIP / top-buyer lists)
CREATE INDEX IF NOT EXISTS customers_total_purchase_amount_idx
  ON public.customers (total_purchase_amount DESC);


-- ─── 2. Extend bills.status constraint ───────────────────────
-- PostgreSQL inline CHECK constraints are named <table>_<col>_check.
-- We drop the old one and recreate it with the two new values.

ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_status_check;

ALTER TABLE public.bills
  ADD CONSTRAINT bills_status_check
    CHECK (status IN (
      'draft', 'sent', 'paid', 'overdue', 'cancelled',
      'partially_paid', 'unpaid'
    ));


-- ─── 3. Audit Log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name   text        NOT NULL,
  record_id    uuid        NOT NULL,
  action       text        NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload      jsonb,
  performed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx
  ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS audit_logs_by_user_idx
  ON public.audit_logs (performed_by)
  WHERE performed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs: read"           ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: service insert" ON public.audit_logs;

-- Authenticated users can read audit history
CREATE POLICY "audit_logs: read"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Direct client inserts are blocked; only the SECURITY DEFINER
-- function (which bypasses RLS) may write audit rows.
CREATE POLICY "audit_logs: service insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);


-- ─── 4. create_invoice() RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_invoice(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ── Local variables ────────────────────────────────────────────
DECLARE
  v_user_id        uuid;
  v_customer_id    uuid;
  v_date           date;
  v_due_date       date;
  v_payment_method text;
  v_notes          text;
  v_status         text;   -- auto-derived; not taken from caller
  v_paid_amount    numeric(12,2);

  v_subtotal       numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
  v_tax_total      numeric(12,2) := 0;
  v_grand_total    numeric(12,2) := 0;

  v_bill_id        uuid;
  v_bill_number    text;

  v_item           jsonb;
  v_inv_qty        numeric(12,3);
  v_item_base      numeric(12,2);
  v_item_disc      numeric(12,2);
  v_item_taxable   numeric(12,2);
  v_item_gst       numeric(12,2);
  v_item_total     numeric(12,2);
  v_pending_delta  numeric(12,2);
  v_pay_method     text;
BEGIN

  -- ── 0. Auth check ──────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: You must be signed in to create an invoice'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 1. Extract and validate header ────────────────────────
  v_customer_id    := NULLIF(p_payload->>'customer_id', '')::uuid;
  v_date           := COALESCE(NULLIF(p_payload->>'date', '')::date, current_date);
  v_due_date       := NULLIF(p_payload->>'due_date', '')::date;
  v_payment_method := COALESCE(NULLIF(p_payload->>'payment_method', ''), 'cash');
  v_notes          := NULLIF(TRIM(COALESCE(p_payload->>'notes', '')), '');
  v_paid_amount    := COALESCE(NULLIF(p_payload->>'paid_amount', '')::numeric, 0);

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION: customer_id is required'
      USING ERRCODE = 'P0002';
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION: Invoice must have at least one line item'
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 2. Lock & pre-validate every item's inventory ─────────
  -- Acquire FOR UPDATE row locks so concurrent invoices cannot
  -- race past the stock check on the same product.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP

    SELECT i.quantity INTO v_inv_qty
      FROM public.inventory i
     WHERE i.product_id = (v_item->>'product_id')::uuid
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STOCK: No inventory record for product "%". Add stock first.',
        COALESCE(NULLIF(v_item->>'product_name', ''), v_item->>'product_id')
        USING ERRCODE = 'P0003';
    END IF;

    IF v_inv_qty < (v_item->>'quantity')::numeric THEN
      RAISE EXCEPTION 'STOCK: Insufficient stock for "%". Available: %, requested: %',
        COALESCE(NULLIF(v_item->>'product_name', ''), 'product'),
        v_inv_qty,
        (v_item->>'quantity')::numeric
        USING ERRCODE = 'P0004';
    END IF;

  END LOOP;

  -- ── 3. Calculate bill totals (pass 1) ─────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    v_item_base    := round((v_item->>'quantity')::numeric
                          * (v_item->>'unit_price')::numeric, 2);
    v_item_disc    := round(v_item_base
                          * (COALESCE((v_item->>'discount_pct')::numeric, 0) / 100), 2);
    v_item_taxable := v_item_base - v_item_disc;
    v_item_gst     := round(v_item_taxable
                          * (COALESCE((v_item->>'gst_rate')::numeric, 0) / 100), 2);
    v_item_total   := v_item_taxable + v_item_gst;

    v_subtotal       := v_subtotal       + v_item_base;
    v_discount_total := v_discount_total + v_item_disc;
    v_tax_total      := v_tax_total      + v_item_gst;
    v_grand_total    := v_grand_total    + v_item_total;
  END LOOP;

  v_subtotal       := round(v_subtotal,       2);
  v_discount_total := round(v_discount_total, 2);
  v_tax_total      := round(v_tax_total,      2);
  v_grand_total    := round(v_grand_total,    2);

  -- Cap paid_amount at grand_total (guard against over-payment entry)
  v_paid_amount := GREATEST(0, LEAST(v_paid_amount, v_grand_total));

  -- ── 4. Auto-derive invoice status from payment ────────────
  --   Full payment  → 'paid'
  --   Partial pay   → 'partially_paid'
  --   No payment    → 'unpaid'
  v_status := CASE
    WHEN v_paid_amount >= v_grand_total AND v_grand_total > 0 THEN 'paid'
    WHEN v_paid_amount > 0                                    THEN 'partially_paid'
    ELSE                                                           'unpaid'
  END;

  -- ── 5. Insert bill header ──────────────────────────────────
  -- The set_bill_number BEFORE INSERT trigger auto-generates bill_number.
  INSERT INTO public.bills (
    customer_id, date, due_date, status,
    subtotal, discount, tax_rate, tax, total,
    paid_amount, payment_method, notes
  ) VALUES (
    v_customer_id, v_date, v_due_date, v_status,
    v_subtotal, v_discount_total, 0, v_tax_total, v_grand_total,
    v_paid_amount, v_payment_method, v_notes
  )
  RETURNING id, bill_number
       INTO v_bill_id, v_bill_number;

  -- ── 6. Insert items + deduct inventory + shade history ────
  --       (pass 2)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    -- Recalculate per-item numbers
    v_item_base    := round((v_item->>'quantity')::numeric
                          * (v_item->>'unit_price')::numeric, 2);
    v_item_disc    := round(v_item_base
                          * (COALESCE((v_item->>'discount_pct')::numeric, 0) / 100), 2);
    v_item_taxable := v_item_base - v_item_disc;
    v_item_gst     := round(v_item_taxable
                          * (COALESCE((v_item->>'gst_rate')::numeric, 0) / 100), 2);
    v_item_total   := v_item_taxable + v_item_gst;

    -- 6a. Bill item row (snapshot product details at sale time)
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name, brand,
      shade_number, pack_size, quantity, unit_price,
      discount, gst_rate, gst_amount, total
    ) VALUES (
      v_bill_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      NULLIF(v_item->>'brand',        ''),
      NULLIF(v_item->>'shade_number', ''),
      NULLIF(v_item->>'pack_size',    ''),
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      v_item_disc,
      COALESCE((v_item->>'gst_rate')::numeric, 0),
      v_item_gst,
      v_item_total
    );

    -- 6b. Deduct inventory.
    --     The CHECK (quantity >= 0) on the inventory table is a final
    --     safety net in case the pre-validation above was somehow bypassed.
    UPDATE public.inventory
       SET quantity = quantity - (v_item->>'quantity')::numeric
     WHERE product_id = (v_item->>'product_id')::uuid;

    -- 6c. Paint shade history.
    --     Record an entry for any item that carries a shade_number.
    IF NULLIF(v_item->>'shade_number', '') IS NOT NULL THEN
      INSERT INTO public.customer_paint_shades (
        customer_id,
        house_mapping_id,
        brand,
        shade_name,
        shade_code,
        room_area,
        applied_date
      ) VALUES (
        v_customer_id,
        NULLIF(v_item->>'house_mapping_id', '')::uuid,
        NULLIF(v_item->>'brand',        ''),
        COALESCE(NULLIF(v_item->>'product_name', ''), v_item->>'shade_number'),
        v_item->>'shade_number',
        NULLIF(v_item->>'room_area',    ''),
        v_date
      );
    END IF;

  END LOOP;

  -- ── 7. Update customer statistics ─────────────────────────
  v_pending_delta := GREATEST(v_grand_total - v_paid_amount, 0);

  UPDATE public.customers
     SET total_purchase_amount = total_purchase_amount + v_grand_total,
         total_purchase_count  = total_purchase_count  + 1,
         pending_balance       = pending_balance        + v_pending_delta,
         last_purchase_date    = v_date,
         updated_at            = now()
   WHERE id = v_customer_id;

  -- ── 8. Payment record (only when money was received) ──────
  IF v_paid_amount > 0 THEN
    -- Map 'credit' → 'other' because payments table accepts only:
    -- cash | upi | bank_transfer | cheque | card | other
    v_pay_method := CASE v_payment_method
      WHEN 'credit' THEN 'other'
      ELSE v_payment_method
    END;

    INSERT INTO public.payments (
      customer_id, bill_id, amount,
      payment_method, payment_date, notes
    ) VALUES (
      v_customer_id,
      v_bill_id,
      v_paid_amount,
      v_pay_method,
      v_date,
      'Payment received for ' || v_bill_number
    );
  END IF;

  -- ── 9. Audit log ───────────────────────────────────────────
  INSERT INTO public.audit_logs (
    table_name, record_id, action, payload, performed_by
  ) VALUES (
    'bills',
    v_bill_id,
    'create',
    jsonb_build_object(
      'bill_number',  v_bill_number,
      'customer_id',  v_customer_id,
      'subtotal',     v_subtotal,
      'discount',     v_discount_total,
      'tax',          v_tax_total,
      'total',        v_grand_total,
      'paid_amount',  v_paid_amount,
      'status',       v_status,
      'item_count',   jsonb_array_length(p_payload->'items')
    ),
    v_user_id
  );

  -- ── 10. Return success payload ─────────────────────────────
  RETURN jsonb_build_object(
    'success',     true,
    'bill_id',     v_bill_id,
    'bill_number', v_bill_number,
    'total',       v_grand_total,
    'paid_amount', v_paid_amount,
    'pending',     v_pending_delta,
    'status',      v_status
  );

-- ── Error handlers ─────────────────────────────────────────────
EXCEPTION
  WHEN check_violation THEN
    -- Fires if inventory.quantity would go below 0 (safety net)
    RAISE EXCEPTION 'STOCK: Cannot reduce inventory below zero. Transaction rolled back.'
      USING ERRCODE = 'P0004';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'REFERENCE: A referenced record (product, customer, or house mapping) does not exist. Transaction rolled back.'
      USING ERRCODE = 'P0005';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'DUPLICATE: A unique constraint was violated. Transaction rolled back.'
      USING ERRCODE = 'P0006';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ─── 5. Grant to authenticated users ──────────────────────────

GRANT EXECUTE ON FUNCTION public.create_invoice(jsonb) TO authenticated;

-- ─── 6. Function comment ──────────────────────────────────────

COMMENT ON FUNCTION public.create_invoice(jsonb) IS
  'Atomically creates a bill + items, deducts inventory (prevents negatives), '
  'auto-derives status (unpaid / partially_paid / paid) from paid_amount, '
  'updates customer stats (total_purchase_amount, total_purchase_count, '
  'pending_balance, last_purchase_date), records payment if paid_amount > 0, '
  'stores paint shade history for shaded items, and writes an audit log entry. '
  'Entire operation rolls back on any error. Caller must be authenticated.';
