-- ============================================================
-- PaintFlow CRM — Purchase Payments (Supplier Payments)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id     uuid        NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  payment_date    date        NOT NULL DEFAULT current_date,
  payment_method  text        NOT NULL DEFAULT 'cash'
                  CHECK (payment_method IN ('cash','upi','cheque','bank_transfer')),
  amount          numeric(14,2) NOT NULL CHECK (amount > 0),
  reference       text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_payments_purchase_id_idx ON public.purchase_payments (purchase_id);
CREATE INDEX IF NOT EXISTS purchase_payments_company_id_idx  ON public.purchase_payments (company_id);
CREATE INDEX IF NOT EXISTS purchase_payments_date_idx        ON public.purchase_payments (payment_date);

-- Add last_payment_date to companies if missing
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS last_payment_date date;

-- RLS
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_payments: read"   ON public.purchase_payments;
DROP POLICY IF EXISTS "purchase_payments: insert" ON public.purchase_payments;
DROP POLICY IF EXISTS "purchase_payments: delete" ON public.purchase_payments;

CREATE POLICY "purchase_payments: read"
  ON public.purchase_payments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "purchase_payments: insert"
  ON public.purchase_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "purchase_payments: delete"
  ON public.purchase_payments FOR DELETE USING (auth.role() = 'authenticated');
