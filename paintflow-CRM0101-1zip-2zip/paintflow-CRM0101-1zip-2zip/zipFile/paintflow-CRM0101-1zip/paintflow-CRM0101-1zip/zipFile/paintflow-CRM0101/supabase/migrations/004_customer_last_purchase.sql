-- ============================================================
-- PaintFlow CRM — Customer Last Purchase Date
-- Run in Supabase SQL Editor AFTER 003_customers_extended.sql
-- ============================================================
-- Adds a denormalized last_purchase_date column to the customers
-- table so sorting by last purchase works efficiently with
-- PostgREST pagination (no subquery needed at query time).
-- A trigger keeps the column in sync whenever bills change.
-- ============================================================

-- ─── Add column ─────────────────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_purchase_date date;

-- ─── Trigger function ────────────────────────────────────────
-- Recalculates last_purchase_date for every customer affected
-- by the operation:
--   INSERT → NEW.customer_id
--   DELETE → OLD.customer_id
--   UPDATE → NEW.customer_id + OLD.customer_id (if they differ,
--             e.g. bill was moved to a different customer)
CREATE OR REPLACE FUNCTION public.sync_customer_last_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_ids uuid[];
  v_cid          uuid;
  v_last_date    date;
BEGIN
  -- Collect all affected customer IDs into an array
  v_customer_ids := ARRAY[]::uuid[];

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.customer_id IS NOT NULL THEN
    v_customer_ids := array_append(v_customer_ids, NEW.customer_id);
  END IF;

  IF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
    v_customer_ids := array_append(v_customer_ids, OLD.customer_id);
  END IF;

  -- On UPDATE where the bill was reassigned to a different customer,
  -- also recalculate the original customer (or it keeps a stale date).
  IF TG_OP = 'UPDATE'
     AND OLD.customer_id IS NOT NULL
     AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    v_customer_ids := array_append(v_customer_ids, OLD.customer_id);
  END IF;

  -- Recalculate and stamp for every affected customer
  FOREACH v_cid IN ARRAY v_customer_ids LOOP
    SELECT MAX(b.date)
    INTO   v_last_date
    FROM   public.bills b
    WHERE  b.customer_id = v_cid
      AND  b.status NOT IN ('cancelled');

    UPDATE public.customers
    SET    last_purchase_date = v_last_date,
           updated_at         = now()
    WHERE  id = v_cid;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_last_purchase_on_bill ON public.bills;
CREATE TRIGGER sync_last_purchase_on_bill
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_last_purchase();

-- ─── Backfill existing data ──────────────────────────────────
UPDATE public.customers c
SET    last_purchase_date = (
  SELECT MAX(b.date)
  FROM   public.bills b
  WHERE  b.customer_id = c.id
    AND  b.status NOT IN ('cancelled')
);
