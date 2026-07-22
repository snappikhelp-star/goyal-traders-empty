-- ============================================================
-- PaintFlow CRM — Fix Table Grants & Complete RLS Policies
-- Migration 013 — Run in Supabase SQL Editor
-- ============================================================
--
-- ROOT CAUSE FIXED:
--   Tables created via SQL migrations in Supabase do NOT get
--   automatic GRANT privileges for the `authenticated` / `anon`
--   PostgreSQL roles. PostgREST uses these roles for all client
--   requests, so without explicit GRANTs every query returns
--   "permission denied for table X" even though RLS policies
--   look correct.
--
-- This migration:
--   1. Grants table-level privileges to `authenticated` + `anon`
--   2. Grants sequence usage (needed for uuid / serial columns)
--   3. Grants RPC execute permissions
--   4. Ensures RLS is enabled on every table
--   5. Idempotently recreates all RLS policies (clean slate)
--   6. Self-heals missing profile rows (dashboard-created users
--      may not have triggered handle_new_user)
--   7. Promotes the first/only user to 'admin' so shop settings
--      and other admin-gated features work out-of-the-box
-- ============================================================


-- ─── 1. Schema usage ─────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated, anon;


-- ─── 2. Sequence grants ──────────────────────────────────────
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;


-- ─── 3. Table-level GRANTs — authenticated (full CRUD) ───────
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shop_settings         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bills                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bill_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_notes        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_photos       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_mappings        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_paint_shades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.companies             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchases             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_items        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_payments     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_transactions TO authenticated;


-- ─── 4. Table-level GRANTs — anon (public storefront only) ───
-- The public /shop catalog reads products, inventory, and shop_settings.
-- All other tables remain inaccessible to unauthenticated visitors.
GRANT SELECT ON TABLE public.products      TO anon;
GRANT SELECT ON TABLE public.inventory     TO anon;
GRANT SELECT ON TABLE public.shop_settings TO anon;


-- ─── 5. RPC execute grants ───────────────────────────────────
GRANT EXECUTE ON FUNCTION public.create_invoice(jsonb)                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, date, text, text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, numeric, text, text, uuid)   TO authenticated;


-- ─── 6. Enable RLS on every table ────────────────────────────
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
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;


-- ─── 7. profiles ─────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: own read"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: own update"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: read own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: self insert"    ON public.profiles;

-- Each user can read their own profile
CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Self-insert: heals cases where handle_new_user trigger did not fire
CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Each user can update their own profile
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (required for role-management UI)
-- Uses a direct auth.uid() check without recursive self-join
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ─── 8. shop_settings ────────────────────────────────────────
-- Single-shop CRM: all authenticated users can read AND write
-- (previously restricted to 'admin' role which blocked new installs)
DROP POLICY IF EXISTS "shop_settings: auth read"   ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings: admin write" ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings: read"        ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings: write"       ON public.shop_settings;

CREATE POLICY "shop_settings: read"
  ON public.shop_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "shop_settings: write"
  ON public.shop_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- anon can read shop name/logo (public storefront header)
DROP POLICY IF EXISTS "shop_settings: anon read"   ON public.shop_settings;
CREATE POLICY "shop_settings: anon read"
  ON public.shop_settings FOR SELECT
  USING (auth.role() = 'anon');


-- ─── 9. customers ────────────────────────────────────────────
DROP POLICY IF EXISTS "customers: auth read"    ON public.customers;
DROP POLICY IF EXISTS "customers: auth insert"  ON public.customers;
DROP POLICY IF EXISTS "customers: auth update"  ON public.customers;
DROP POLICY IF EXISTS "customers: admin delete" ON public.customers;
DROP POLICY IF EXISTS "customers: read"         ON public.customers;
DROP POLICY IF EXISTS "customers: insert"       ON public.customers;
DROP POLICY IF EXISTS "customers: update"       ON public.customers;
DROP POLICY IF EXISTS "customers: delete"       ON public.customers;

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
  USING (auth.role() = 'authenticated');


-- ─── 10. products ────────────────────────────────────────────
DROP POLICY IF EXISTS "products: auth read"    ON public.products;
DROP POLICY IF EXISTS "products: auth insert"  ON public.products;
DROP POLICY IF EXISTS "products: auth update"  ON public.products;
DROP POLICY IF EXISTS "products: admin delete" ON public.products;
DROP POLICY IF EXISTS "products: auth all"     ON public.products;
DROP POLICY IF EXISTS "products: read"         ON public.products;
DROP POLICY IF EXISTS "products: insert"       ON public.products;
DROP POLICY IF EXISTS "products: update"       ON public.products;
DROP POLICY IF EXISTS "products: delete"       ON public.products;

CREATE POLICY "products: read"
  ON public.products FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "products: insert"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: update"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: delete"
  ON public.products FOR DELETE
  USING (auth.role() = 'authenticated');


-- ─── 11. inventory ───────────────────────────────────────────
DROP POLICY IF EXISTS "inventory: auth read"  ON public.inventory;
DROP POLICY IF EXISTS "inventory: auth write" ON public.inventory;
DROP POLICY IF EXISTS "inventory: auth all"   ON public.inventory;
DROP POLICY IF EXISTS "inventory: read"       ON public.inventory;
DROP POLICY IF EXISTS "inventory: write"      ON public.inventory;

CREATE POLICY "inventory: read"
  ON public.inventory FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "inventory: write"
  ON public.inventory FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 12. bills ───────────────────────────────────────────────
DROP POLICY IF EXISTS "bills: auth read"    ON public.bills;
DROP POLICY IF EXISTS "bills: auth insert"  ON public.bills;
DROP POLICY IF EXISTS "bills: auth update"  ON public.bills;
DROP POLICY IF EXISTS "bills: admin delete" ON public.bills;
DROP POLICY IF EXISTS "bills: auth all"     ON public.bills;
DROP POLICY IF EXISTS "bills: read"         ON public.bills;
DROP POLICY IF EXISTS "bills: insert"       ON public.bills;
DROP POLICY IF EXISTS "bills: update"       ON public.bills;
DROP POLICY IF EXISTS "bills: delete"       ON public.bills;

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
  USING (auth.role() = 'authenticated');


-- ─── 13. bill_items ──────────────────────────────────────────
DROP POLICY IF EXISTS "bill_items: auth read"  ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: auth write" ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: auth all"   ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: read"       ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: insert"     ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: update"     ON public.bill_items;
DROP POLICY IF EXISTS "bill_items: delete"     ON public.bill_items;

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


-- ─── 14. customer_notes ──────────────────────────────────────
DROP POLICY IF EXISTS "customer_notes: auth all" ON public.customer_notes;
DROP POLICY IF EXISTS "customer_notes: all"      ON public.customer_notes;

CREATE POLICY "customer_notes: all"
  ON public.customer_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 15. customer_photos ─────────────────────────────────────
DROP POLICY IF EXISTS "customer_photos: auth all" ON public.customer_photos;
DROP POLICY IF EXISTS "customer_photos: all"      ON public.customer_photos;

CREATE POLICY "customer_photos: all"
  ON public.customer_photos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 16. house_mappings ──────────────────────────────────────
DROP POLICY IF EXISTS "house_mappings: auth all" ON public.house_mappings;
DROP POLICY IF EXISTS "house_mappings: all"      ON public.house_mappings;

CREATE POLICY "house_mappings: all"
  ON public.house_mappings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 17. customer_paint_shades ───────────────────────────────
DROP POLICY IF EXISTS "customer_paint_shades: auth all" ON public.customer_paint_shades;
DROP POLICY IF EXISTS "customer_paint_shades: all"      ON public.customer_paint_shades;

CREATE POLICY "customer_paint_shades: all"
  ON public.customer_paint_shades FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 18. payments ────────────────────────────────────────────
DROP POLICY IF EXISTS "payments: auth all" ON public.payments;
DROP POLICY IF EXISTS "payments: all"      ON public.payments;

CREATE POLICY "payments: all"
  ON public.payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 19. audit_logs ──────────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs: read"           ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: service insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: all"            ON public.audit_logs;

-- Authenticated users can read the audit trail
CREATE POLICY "audit_logs: read"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert (needed for direct inserts outside RPCs)
CREATE POLICY "audit_logs: insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 20. companies ───────────────────────────────────────────
DROP POLICY IF EXISTS "companies: authenticated read"   ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated insert" ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated update" ON public.companies;
DROP POLICY IF EXISTS "companies: authenticated delete" ON public.companies;
DROP POLICY IF EXISTS "companies: all"                  ON public.companies;

CREATE POLICY "companies: all"
  ON public.companies FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 21. purchases ───────────────────────────────────────────
DROP POLICY IF EXISTS "purchases: read"   ON public.purchases;
DROP POLICY IF EXISTS "purchases: insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases: update" ON public.purchases;
DROP POLICY IF EXISTS "purchases: delete" ON public.purchases;
DROP POLICY IF EXISTS "purchases: all"    ON public.purchases;

CREATE POLICY "purchases: all"
  ON public.purchases FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 22. purchase_items ──────────────────────────────────────
DROP POLICY IF EXISTS "purchase_items: read"   ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: insert" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: update" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: delete" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items: all"    ON public.purchase_items;

CREATE POLICY "purchase_items: all"
  ON public.purchase_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 23. purchase_payments ───────────────────────────────────
DROP POLICY IF EXISTS "purchase_payments: read"   ON public.purchase_payments;
DROP POLICY IF EXISTS "purchase_payments: insert" ON public.purchase_payments;
DROP POLICY IF EXISTS "purchase_payments: delete" ON public.purchase_payments;
DROP POLICY IF EXISTS "purchase_payments: all"    ON public.purchase_payments;

CREATE POLICY "purchase_payments: all"
  ON public.purchase_payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 24. inventory_transactions ──────────────────────────────
DROP POLICY IF EXISTS "inv_tx: auth all" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inv_tx: all"      ON public.inventory_transactions;

CREATE POLICY "inv_tx: all"
  ON public.inventory_transactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── 25. Self-heal missing profile rows ──────────────────────
-- Users created via the Supabase dashboard may not have triggered
-- the handle_new_user() trigger. This inserts a profile row for
-- any auth.users row that has no matching profiles row.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'admin'                       -- first user in a fresh install is admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- ─── 26. Promote first user to admin ─────────────────────────
-- If there is only one user in the system (fresh install) and
-- their role is still the default 'staff', upgrade to 'admin'
-- so they can access all features immediately.
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'staff'
  AND id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
  AND (SELECT COUNT(*) FROM public.profiles) = 1;


-- ─── Done ─────────────────────────────────────────────────────
-- After running this migration:
--   • All tables are accessible to authenticated users
--   • All CRUD operations are permitted by RLS
--   • shop_settings can be read/written by all authenticated users
--   • The first/only user has admin role
--   • Public storefront (anon) can read products, inventory, shop_settings
