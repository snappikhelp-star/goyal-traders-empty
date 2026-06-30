-- ============================================================
-- PaintFlow CRM — Record Payment RPC
-- Run in Supabase SQL Editor AFTER 008_products_inventory.sql
--
-- Creates record_payment() SECURITY DEFINER function that atomically:
--   1. Validates auth + inputs
--   2. Locks the bill row (prevents concurrent payment races)
--   3. Validates amount ≤ remaining balance, bill not cancelled/paid
--   4. Inserts a payment row into public.payments
--   5. Updates bill.paid_amount and auto-derives new status
--   6. Updates customer.pending_balance (decrements by paid amount)
--   7. Writes an audit log entry
--   8. Returns updated bill state as JSONB
-- ============================================================


-- ─── 1. Add useful indexes for payment queries ────────────────

-- Fast lookup of all payments for a given date (Daily Collection report)
CREATE INDEX IF NOT EXISTS payments_payment_date_idx
  ON public.payments (payment_date DESC);

-- Fast lookup of payments by customer + date (customer due dashboard)
CREATE INDEX IF NOT EXISTS payments_customer_date_idx
  ON public.payments (customer_id, payment_date DESC);

-- Bills by status (Outstanding / Overdue report)
CREATE INDEX IF NOT EXISTS bills_status_idx
  ON public.bills (status)
  WHERE status IN ('unpaid', 'partially_paid', 'overdue', 'sent');

-- Bills by due date (overdue detection)
CREATE INDEX IF NOT EXISTS bills_due_date_idx
  ON public.bills (due_date)
  WHERE due_date IS NOT NULL;


-- ─── 2. record_payment() RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_payment(
  p_bill_id   uuid,
  p_amount    numeric(12,2),
  p_method    text,
  p_date      date    DEFAULT current_date,
  p_reference text    DEFAULT NULL,
  p_notes     text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_bill        RECORD;
  v_remaining   numeric(12,2);
  v_new_paid    numeric(12,2);
  v_new_status  text;
  v_payment_id  uuid;
BEGIN

  -- ── 0. Auth check ───────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Sign in to record a payment'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 1. Validate inputs ──────────────────────────────────────
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'VALIDATION: Payment amount must be greater than zero'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_method IS NULL OR p_method NOT IN (
    'cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other'
  ) THEN
    RAISE EXCEPTION 'VALIDATION: Invalid payment method "%"', COALESCE(p_method, 'null')
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 2. Lock bill row (prevents concurrent races) ────────────
  SELECT *
    INTO v_bill
    FROM public.bills
   WHERE id = p_bill_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Bill does not exist'
      USING ERRCODE = 'P0003';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'VALIDATION: Cannot record payment on a cancelled bill'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_bill.status = 'paid' THEN
    RAISE EXCEPTION 'VALIDATION: This bill is already fully paid'
      USING ERRCODE = 'P0002';
  END IF;

  v_remaining := v_bill.total - COALESCE(v_bill.paid_amount, 0);

  IF p_amount > v_remaining + 0.01 THEN  -- allow tiny float rounding
    RAISE EXCEPTION 'VALIDATION: Payment amount (%) exceeds remaining balance (%). Record a smaller amount.',
      p_amount, v_remaining
      USING ERRCODE = 'P0002';
  END IF;

  -- Cap at remaining to absorb tiny rounding errors
  p_amount := LEAST(p_amount, v_remaining);

  -- ── 3. Insert payment row ────────────────────────────────────
  INSERT INTO public.payments (
    customer_id,
    bill_id,
    amount,
    payment_method,
    payment_date,
    reference,
    notes
  ) VALUES (
    v_bill.customer_id,
    p_bill_id,
    p_amount,
    p_method,
    p_date,
    NULLIF(TRIM(COALESCE(p_reference, '')), ''),
    NULLIF(TRIM(COALESCE(p_notes, '')), '')
  )
  RETURNING id INTO v_payment_id;

  -- ── 4. Update bill totals + auto-derive status ───────────────
  v_new_paid   := COALESCE(v_bill.paid_amount, 0) + p_amount;
  v_new_status := CASE
    WHEN v_new_paid >= v_bill.total THEN 'paid'
    WHEN v_new_paid > 0             THEN 'partially_paid'
    ELSE                                 'unpaid'
  END;

  UPDATE public.bills
     SET paid_amount = v_new_paid,
         status      = v_new_status,
         updated_at  = now()
   WHERE id = p_bill_id;

  -- ── 5. Update customer pending_balance ───────────────────────
  UPDATE public.customers
     SET pending_balance = GREATEST(pending_balance - p_amount, 0),
         updated_at      = now()
   WHERE id = v_bill.customer_id;

  -- ── 6. Audit log ─────────────────────────────────────────────
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    payload,
    performed_by
  ) VALUES (
    'payments',
    v_payment_id,
    'create',
    jsonb_build_object(
      'bill_id',      p_bill_id,
      'bill_number',  v_bill.bill_number,
      'customer_id',  v_bill.customer_id,
      'amount',       p_amount,
      'method',       p_method,
      'date',         p_date,
      'old_status',   v_bill.status,
      'new_status',   v_new_status,
      'remaining',    v_bill.total - v_new_paid
    ),
    v_user_id
  );

  -- ── 7. Return updated state ──────────────────────────────────
  RETURN jsonb_build_object(
    'success',      true,
    'payment_id',   v_payment_id,
    'bill_id',      p_bill_id,
    'customer_id',  v_bill.customer_id,
    'bill_number',  v_bill.bill_number,
    'amount',       p_amount,
    'paid_amount',  v_new_paid,
    'remaining',    v_bill.total - v_new_paid,
    'new_status',   v_new_status
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'REFERENCE: Bill or customer reference is invalid. Transaction rolled back.'
      USING ERRCODE = 'P0005';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ─── 3. Grant execute to authenticated users ──────────────────

GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, date, text, text)
  TO authenticated;

-- ─── 4. Function comment ──────────────────────────────────────

COMMENT ON FUNCTION public.record_payment(uuid, numeric, text, date, text, text) IS
  'Atomically records a payment against a bill: inserts into payments, '
  'updates bill.paid_amount + auto-derives status (partially_paid/paid), '
  'decrements customer.pending_balance, writes audit log. '
  'Validates: auth, amount > 0, amount ≤ remaining, bill not cancelled/paid. '
  'Entire operation rolls back on any error. Caller must be authenticated.';
