-- ============================================================
-- PaintFlow CRM — Demo Seed v2
-- Run in Supabase Dashboard → SQL Editor
-- Idempotent: only inserts when tables have ≤ 2 rows.
-- Does NOT use create_invoice() RPC (requires auth context).
-- ============================================================

DO $$
DECLARE
  -- ── Product IDs ────────────────────────────────────────────
  p01 uuid := 'f1000001-0001-0001-0001-000000000001'; -- JSW Interior Emulsion
  p02 uuid := 'f1000001-0001-0001-0001-000000000002'; -- JSW Exterior Acrylic
  p03 uuid := 'f1000001-0001-0001-0001-000000000003'; -- JSW Premium Royale
  p04 uuid := 'f1000001-0001-0001-0001-000000000004'; -- JSW Primer Coat
  p05 uuid := 'f1000001-0001-0001-0001-000000000005'; -- JSW Waterproof Exterior
  p06 uuid := 'f1000001-0001-0001-0001-000000000006'; -- Birla Opus Interior Paint
  p07 uuid := 'f1000001-0001-0001-0001-000000000007'; -- Birla Opus Exterior Paint
  p08 uuid := 'f1000001-0001-0001-0001-000000000008'; -- Birla Opus Putty
  p09 uuid := 'f1000001-0001-0001-0001-000000000009'; -- Birla Opus Primer
  p10 uuid := 'f1000001-0001-0001-0001-000000000010'; -- Birla Opus Rustic Texture
  p11 uuid := 'f1000001-0001-0001-0001-000000000011'; -- Wall Putty
  p12 uuid := 'f1000001-0001-0001-0001-000000000012'; -- Red Oxide Primer
  p13 uuid := 'f1000001-0001-0001-0001-000000000013'; -- Enamel Oil Paint
  p14 uuid := 'f1000001-0001-0001-0001-000000000014'; -- Rust Protection Paint
  p15 uuid := 'f1000001-0001-0001-0001-000000000015'; -- Wood Polish

  -- ── Customer IDs ───────────────────────────────────────────
  c01 uuid := 'f2000002-0002-0002-0002-000000000001'; -- Ramesh Verma
  c02 uuid := 'f2000002-0002-0002-0002-000000000002'; -- Suresh Yadav
  c03 uuid := 'f2000002-0002-0002-0002-000000000003'; -- Mohan Sharma
  c04 uuid := 'f2000002-0002-0002-0002-000000000004'; -- Anita Devi
  c05 uuid := 'f2000002-0002-0002-0002-000000000005'; -- Vikram Singh

  -- ── Bill IDs ───────────────────────────────────────────────
  b01 uuid := 'f3000003-0003-0003-0003-000000000001'; -- Ramesh bill
  b02 uuid := 'f3000003-0003-0003-0003-000000000002'; -- Suresh bill
  b03 uuid := 'f3000003-0003-0003-0003-000000000003'; -- Mohan bill
  b04 uuid := 'f3000003-0003-0003-0003-000000000004'; -- Anita bill
  b05 uuid := 'f3000003-0003-0003-0003-000000000005'; -- Vikram bill

  -- ── State checks ───────────────────────────────────────────
  prod_count int;
  cust_count int;
  bill_count int;

  -- ── Computed totals (set after trigger recalculates) ───────
  b01_total numeric(12,2);
  b02_total numeric(12,2);
  b03_total numeric(12,2);
  b04_total numeric(12,2);
  b05_total numeric(12,2);
BEGIN

  SELECT COUNT(*) INTO prod_count FROM public.products;
  SELECT COUNT(*) INTO cust_count FROM public.customers;
  SELECT COUNT(*) INTO bill_count FROM public.bills;

  RAISE NOTICE 'Current counts → products: %, customers: %, bills: %',
    prod_count, cust_count, bill_count;

  -- ════════════════════════════════════════════════════════════
  -- 1. PRODUCTS  (seed when ≤ 2 exist)
  -- ════════════════════════════════════════════════════════════
  IF prod_count <= 2 THEN

    INSERT INTO public.products
      (id, name, sku, brand, category, price, unit, purchase_price, gst_rate, is_active)
    VALUES
      -- JSW Paints
      (p01, 'JSW Interior Emulsion',       'JSW-INT-EM-001',  'JSW Paints',  'Interior Paint',  4500.00, 'tin (10L)',     3800.00, 18, true),
      (p02, 'JSW Exterior Acrylic',        'JSW-EXT-AC-001',  'JSW Paints',  'Exterior Paint',  5200.00, 'tin (10L)',     4400.00, 18, true),
      (p03, 'JSW Premium Royale',          'JSW-ROY-PR-001',  'JSW Paints',  'Interior Paint',  7800.00, 'tin (10L)',     6500.00, 18, true),
      (p04, 'JSW Primer Coat',             'JSW-PRI-CO-001',  'JSW Paints',  'Primer',          2200.00, 'tin (10L)',     1800.00, 18, true),
      (p05, 'JSW Waterproof Exterior',     'JSW-WP-EX-001',   'JSW Paints',  'Exterior Paint',  6400.00, 'tin (10L)',     5400.00, 18, true),
      -- Birla Opus
      (p06, 'Birla Opus Interior Paint',   'BOP-INT-PA-001',  'Birla Opus',  'Interior Paint',  4200.00, 'tin (10L)',     3500.00, 18, true),
      (p07, 'Birla Opus Exterior Paint',   'BOP-EXT-PA-001',  'Birla Opus',  'Exterior Paint',  5000.00, 'tin (10L)',     4200.00, 18, true),
      (p08, 'Birla Opus Putty',            'BOP-PUT-20-001',  'Birla Opus',  'Wall Putty',       800.00, 'bag (20kg)',     600.00, 18, true),
      (p09, 'Birla Opus Primer',           'BOP-PRI-PR-001',  'Birla Opus',  'Primer',          2100.00, 'tin (10L)',     1700.00, 18, true),
      (p10, 'Birla Opus Rustic Texture',   'BOP-TEX-RU-001',  'Birla Opus',  'Texture Paint',   8500.00, 'bucket (10L)', 7000.00, 18, true),
      -- Others
      (p11, 'Wall Putty',                  'GEN-PUT-WL-001',  'Generic',     'Wall Putty',       550.00, 'bag (20kg)',     400.00, 18, true),
      (p12, 'Red Oxide Primer',            'GEN-PRI-RO-001',  'Generic',     'Primer',           900.00, 'tin (4L)',       700.00, 18, true),
      (p13, 'Enamel Oil Paint',            'GEN-ENA-OI-001',  'Generic',     'Enamel',          1400.00, 'tin (4L)',      1100.00, 18, true),
      (p14, 'Rust Protection Paint',       'GEN-RST-PR-001',  'Generic',     'Metal Paint',     1800.00, 'tin (4L)',      1450.00, 18, true),
      (p15, 'Wood Polish',                 'GEN-WOD-PO-001',  'Generic',     'Wood Finish',      650.00, 'bottle (1L)',   500.00, 18, true)
    ON CONFLICT (id) DO NOTHING;

    -- Auto-trigger creates inventory rows; set stock levels
    UPDATE public.inventory SET quantity = 60, min_quantity = 5, reorder_level = 10
    WHERE product_id IN (p01, p02, p03, p04, p05, p06, p07, p08, p09, p10,
                          p11, p12, p13, p14, p15);

    RAISE NOTICE 'Products seeded ✓';
  ELSE
    RAISE NOTICE 'Products already exist (%), skipping.', prod_count;
  END IF;


  -- ════════════════════════════════════════════════════════════
  -- 2. CUSTOMERS  (seed when ≤ 2 exist)
  -- ════════════════════════════════════════════════════════════
  IF cust_count <= 2 THEN

    INSERT INTO public.customers
      (id, name, phone, address, city, state, notes)
    VALUES
      (c01, 'Ramesh Verma',  '9876501001', '12 Gandhi Nagar, Ward No. 4',      'Salamatpur',  'Madhya Pradesh', 'Regular customer, prefers JSW brands'),
      (c02, 'Suresh Yadav',  '9876501002', '45 New Colony, Near Bus Stand',     'Raisen',      'Madhya Pradesh', 'Contractor, buys in bulk'),
      (c03, 'Mohan Sharma',  '9876501003', '8 Shivaji Chowk, Old Market',       'Bhopal',      'Madhya Pradesh', 'Interior renovation project'),
      (c04, 'Anita Devi',    '9876501004', '22 Subhash Marg, Civil Lines',      'Sehore',      'Madhya Pradesh', 'New home construction'),
      (c05, 'Vikram Singh',  '9876501005', '1 Contractor Bhawan, Industrial Area','Vidisha',   'Madhya Pradesh', 'Commercial contractor, large orders')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Customers seeded ✓';
  ELSE
    RAISE NOTICE 'Customers already exist (%), skipping.', cust_count;
  END IF;


  -- ════════════════════════════════════════════════════════════
  -- 3. BILLS + ITEMS + PAYMENTS  (seed only when bills = 0)
  -- ════════════════════════════════════════════════════════════
  IF bill_count = 0 THEN

    -- ── Insert bill shells (bill_number auto-set by trigger) ──
    INSERT INTO public.bills
      (id, customer_id, date, status, subtotal, discount, tax_rate, tax, total, paid_amount, payment_method)
    VALUES
      (b01, c01, current_date - 25, 'paid',     0, 0, 0, 0, 0, 0, 'cash'),
      (b02, c02, current_date - 18, 'paid',     0, 0, 0, 0, 0, 0, 'upi'),
      (b03, c03, current_date - 12, 'overdue',  0, 0, 0, 0, 0, 0, 'cheque'),
      (b04, c04, current_date -  8, 'sent',     0, 0, 0, 0, 0, 0, 'cash'),
      (b05, c05, current_date -  3, 'sent',     0, 0, 0, 0, 0, 0, 'bank_transfer')
    ON CONFLICT (id) DO NOTHING;

    -- ── Bill items — trigger recalculates bill totals ─────────

    -- Bill 1: Ramesh — interior repaint, cash paid in full
    INSERT INTO public.bill_items
      (bill_id, product_id, product_name, brand, quantity, unit_price, discount, gst_rate, gst_amount, total)
    VALUES
      (b01, p01, 'JSW Interior Emulsion',     'JSW Paints', 3, 4500.00, 0, 18, 2430.00, 16430.00),
      (b01, p06, 'Birla Opus Interior Paint', 'Birla Opus', 1, 4200.00, 0, 18,  756.00,  4956.00),
      (b01, p08, 'Birla Opus Putty',          'Birla Opus', 2,  800.00, 0, 18,  288.00,  1888.00);
    -- Items total ≈ 23274; trigger sets bill total

    -- Bill 2: Suresh — exterior project, UPI paid full
    INSERT INTO public.bill_items
      (bill_id, product_id, product_name, brand, quantity, unit_price, discount, gst_rate, gst_amount, total)
    VALUES
      (b02, p02, 'JSW Exterior Acrylic',      'JSW Paints', 2, 5200.00, 0, 18, 1872.00, 12272.00),
      (b02, p07, 'Birla Opus Exterior Paint', 'Birla Opus', 1, 5000.00, 0, 18,  900.00,  5900.00);
    -- Items total ≈ 18172; trigger sets bill total

    -- Bill 3: Mohan — cheque pending, not paid
    INSERT INTO public.bill_items
      (bill_id, product_id, product_name, brand, quantity, unit_price, discount, gst_rate, gst_amount, total)
    VALUES
      (b03, p03, 'JSW Premium Royale',        'JSW Paints', 1, 7800.00, 0, 18, 1404.00,  9204.00),
      (b03, p04, 'JSW Primer Coat',           'JSW Paints', 1, 2200.00, 0, 18,  396.00,  2596.00),
      (b03, p11, 'Wall Putty',                'Generic',    2,  550.00, 0, 18,  198.00,  1298.00);
    -- Items total ≈ 13098; trigger sets bill total

    -- Bill 4: Anita — partial payment (paid 10000)
    INSERT INTO public.bill_items
      (bill_id, product_id, product_name, brand, quantity, unit_price, discount, gst_rate, gst_amount, total)
    VALUES
      (b04, p05, 'JSW Waterproof Exterior',   'JSW Paints', 2, 6400.00, 0, 18, 2304.00, 15104.00),
      (b04, p09, 'Birla Opus Primer',         'Birla Opus', 1, 2100.00, 0, 18,  378.00,  2478.00),
      (b04, p08, 'Birla Opus Putty',          'Birla Opus', 2,  800.00, 0, 18,  288.00,  1888.00);
    -- Items total ≈ 19470; trigger sets bill total

    -- Bill 5: Vikram — large contractor order, partial payment (paid 30000)
    INSERT INTO public.bill_items
      (bill_id, product_id, product_name, brand, quantity, unit_price, discount, gst_rate, gst_amount, total)
    VALUES
      (b05, p03, 'JSW Premium Royale',        'JSW Paints', 3,  7800.00, 0, 18, 4212.00, 27612.00),
      (b05, p10, 'Birla Opus Rustic Texture', 'Birla Opus', 1,  8500.00, 0, 18, 1530.00, 10030.00),
      (b05, p02, 'JSW Exterior Acrylic',      'JSW Paints', 2,  5200.00, 0, 18, 1872.00, 12272.00),
      (b05, p07, 'Birla Opus Exterior Paint', 'Birla Opus', 1,  5000.00, 0, 18,  900.00,  5900.00);
    -- Items total ≈ 55814; trigger sets bill total

    -- ── Read actual totals computed by trigger ────────────────
    SELECT total INTO b01_total FROM public.bills WHERE id = b01;
    SELECT total INTO b02_total FROM public.bills WHERE id = b02;
    SELECT total INTO b03_total FROM public.bills WHERE id = b03;
    SELECT total INTO b04_total FROM public.bills WHERE id = b04;
    SELECT total INTO b05_total FROM public.bills WHERE id = b05;

    RAISE NOTICE 'Bill totals → B1:%, B2:%, B3:%, B4:%, B5:%',
      b01_total, b02_total, b03_total, b04_total, b05_total;

    -- ── Update paid amounts and status ────────────────────────
    -- Bill 1: fully paid (cash)
    UPDATE public.bills
    SET paid_amount = b01_total, status = 'paid'
    WHERE id = b01;

    -- Bill 2: fully paid (UPI)
    UPDATE public.bills
    SET paid_amount = b02_total, status = 'paid'
    WHERE id = b02;

    -- Bill 3: not paid (cheque pending) — leave paid_amount = 0, status = 'overdue'
    -- (already set correctly from INSERT above)

    -- Bill 4: partially paid (10000 cash)
    UPDATE public.bills
    SET paid_amount = 10000.00, status = 'sent'
    WHERE id = b04;

    -- Bill 5: partially paid (30000 bank transfer)
    UPDATE public.bills
    SET paid_amount = 30000.00, status = 'sent'
    WHERE id = b05;

    -- ── Deduct inventory for sold items ──────────────────────
    -- Bill 1
    UPDATE public.inventory SET quantity = quantity - 3 WHERE product_id = p01;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p06;
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p08;
    -- Bill 2
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p02;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p07;
    -- Bill 3
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p03;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p04;
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p11;
    -- Bill 4
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p05;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p09;
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p08;
    -- Bill 5
    UPDATE public.inventory SET quantity = quantity - 3 WHERE product_id = p03;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p10;
    UPDATE public.inventory SET quantity = quantity - 2 WHERE product_id = p02;
    UPDATE public.inventory SET quantity = quantity - 1 WHERE product_id = p07;

    -- ── Payment records ───────────────────────────────────────
    -- Bill 1: full cash payment
    INSERT INTO public.payments (customer_id, bill_id, amount, payment_method, payment_date, notes)
    VALUES (c01, b01, b01_total, 'cash', current_date - 25, 'Full payment received — cash');

    -- Bill 2: full UPI payment
    INSERT INTO public.payments (customer_id, bill_id, amount, payment_method, payment_date, notes)
    VALUES (c02, b02, b02_total, 'upi', current_date - 18, 'Full payment received — UPI');

    -- Bill 3: no payment (cheque not cleared)
    -- (skip payment record)

    -- Bill 4: partial cash payment
    INSERT INTO public.payments (customer_id, bill_id, amount, payment_method, payment_date, notes)
    VALUES (c04, b04, 10000.00, 'cash', current_date - 8, 'Advance payment — balance pending');

    -- Bill 5: partial bank transfer
    INSERT INTO public.payments (customer_id, bill_id, amount, payment_method, payment_date, notes)
    VALUES (c05, b05, 30000.00, 'bank_transfer', current_date - 3, 'Advance payment — large contractor order');

    -- ── Update customer statistics ────────────────────────────
    -- Ramesh: total = b01_total, pending = 0
    UPDATE public.customers SET
      total_purchase_amount = b01_total,
      total_purchase_count  = 1,
      pending_balance       = 0,
      last_purchase_date    = (current_date - 25)
    WHERE id = c01;

    -- Suresh: total = b02_total, pending = 0
    UPDATE public.customers SET
      total_purchase_amount = b02_total,
      total_purchase_count  = 1,
      pending_balance       = 0,
      last_purchase_date    = (current_date - 18)
    WHERE id = c02;

    -- Mohan: total = b03_total, pending = b03_total (nothing paid)
    UPDATE public.customers SET
      total_purchase_amount = b03_total,
      total_purchase_count  = 1,
      pending_balance       = b03_total,
      last_purchase_date    = (current_date - 12)
    WHERE id = c03;

    -- Anita: total = b04_total, pending = b04_total - 10000
    UPDATE public.customers SET
      total_purchase_amount = b04_total,
      total_purchase_count  = 1,
      pending_balance       = GREATEST(b04_total - 10000.00, 0),
      last_purchase_date    = (current_date - 8)
    WHERE id = c04;

    -- Vikram: total = b05_total, pending = b05_total - 30000
    UPDATE public.customers SET
      total_purchase_amount = b05_total,
      total_purchase_count  = 1,
      pending_balance       = GREATEST(b05_total - 30000.00, 0),
      last_purchase_date    = (current_date - 3)
    WHERE id = c05;

    RAISE NOTICE 'Bills, items, payments, and customer stats seeded ✓';

  ELSE
    RAISE NOTICE 'Bills already exist (%), skipping.', bill_count;
  END IF;


  -- ════════════════════════════════════════════════════════════
  -- 4. VERIFICATION SUMMARY
  -- ════════════════════════════════════════════════════════════
  RAISE NOTICE '────────────────────────────────────────────';
  RAISE NOTICE 'Final counts:';
  RAISE NOTICE '  products        = %', (SELECT COUNT(*) FROM public.products);
  RAISE NOTICE '  customers       = %', (SELECT COUNT(*) FROM public.customers);
  RAISE NOTICE '  bills           = %', (SELECT COUNT(*) FROM public.bills);
  RAISE NOTICE '  bill_items      = %', (SELECT COUNT(*) FROM public.bill_items);
  RAISE NOTICE '  payments        = %', (SELECT COUNT(*) FROM public.payments);
  RAISE NOTICE '  total revenue   = ₹%', (SELECT COALESCE(SUM(total),0) FROM public.bills);
  RAISE NOTICE '  total collected = ₹%', (SELECT COALESCE(SUM(paid_amount),0) FROM public.bills);
  RAISE NOTICE '────────────────────────────────────────────';

END $$;
