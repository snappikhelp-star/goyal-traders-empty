-- ============================================================
-- PaintFlow CRM — Company Master
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text        NOT NULL,
  brand             text        CHECK (brand IN ('JSW Paints', 'Birla Opus', 'Other')),
  contact_person    text,
  mobile            text,
  email             text,
  gstin             text,
  address           text,
  credit_limit      numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  payment_terms_days integer     NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  opening_due       numeric(14,2) NOT NULL DEFAULT 0,
  notes             text,
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_name_idx   ON public.companies (name);
CREATE INDEX IF NOT EXISTS companies_brand_idx  ON public.companies (brand);
CREATE INDEX IF NOT EXISTS companies_status_idx ON public.companies (status);

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_companies()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_companies ON public.companies;
CREATE TRIGGER set_updated_at_companies
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at_companies();

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies: authenticated read"   ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated insert" ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated update" ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated delete" ON public.companies;

CREATE POLICY "companies: authenticated read"
  ON public.companies FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "companies: authenticated insert"
  ON public.companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "companies: authenticated update"
  ON public.companies FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "companies: authenticated delete"
  ON public.companies FOR DELETE USING (auth.role() = 'authenticated');
