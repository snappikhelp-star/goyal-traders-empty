-- ============================================================
-- PaintFlow CRM — Purchase Module
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Add supplier-ledger columns to companies ─────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS total_purchase   numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid       numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_due  numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_date date;

-- ── Purchases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id               uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid         REFERENCES public.companies(id) ON DELETE SET NULL,
  invoice_number   text         NOT NULL,
  invoice_date     date         NOT NULL DEFAULT current_date,
  due_date         date,
  payment_method   text         NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash','upi','cheque','bank_transfer')),
  status           text         NOT NULL DEFAULT 'due'
                   CHECK (status IN ('paid','partial','due')),
  subtotal         numeric(14,2) NOT NULL DEFAULT 0,
  gst_amount       numeric(14,2) NOT NULL DEFAULT 0,
  grand_total      numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount      numeric(14,2) NOT NULL DEFAULT 0,
  due_amount       numeric(14,2) NOT NULL DEFAULT 0,
  notes            text,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_company_id_idx   ON public.purchases (company_id);
CREATE INDEX IF NOT EXISTS purchases_invoice_date_idx ON public.purchases (invoice_date);
CREATE INDEX IF NOT EXISTS purchases_status_idx       ON public.purchases (status);

-- ── Purchase Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id               uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id      uuid         NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id       uuid         REFERENCES public.products(id) ON DELETE SET NULL,
  product_name     text         NOT NULL,
  quantity         numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  purchase_price   numeric(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  gst_percent      numeric(5,2)  NOT NULL DEFAULT 0 CHECK (gst_percent >= 0),
  discount_percent numeric(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent >= 0),
  line_total       numeric(14,2) NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON public.purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS purchase_items_product_id_idx  ON public.purchase_items (product_id);

-- ── Auto updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_purchases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_updated_at_purchases ON public.purchases;
CREATE TRIGGER set_updated_at_purchases
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at_purchases();

-- ── RLS — purchases ───────────────────────────────────────────
ALTER TABLE public.purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases: read"   ON public.purchases;
DROP POLICY IF EXISTS "purchases: insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases: update" ON public.purchases;
DROP POLICY IF EXISTS "purchases: delete" ON public.purchases;

CREATE POLICY "purchases: read"   ON public.purchases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "purchases: insert" ON public.purchases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "purchases: update" ON public.purchases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "purchases: delete" ON public.purchases FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "purchase_items: read"   ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: insert" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: update" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: delete" ON public.purchase_items;

CREATE POLICY "purchase_items: read"   ON public.purchase_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "purchase_items: insert" ON public.purchase_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "purchase_items: update" ON public.purchase_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "purchase_items: delete" ON public.purchase_items FOR DELETE USING (auth.role() = 'authenticated');
