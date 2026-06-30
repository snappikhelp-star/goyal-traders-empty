-- ============================================================
-- PaintFlow CRM — Complete Demo Seed for GOYAL TRADERS
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (ON CONFLICT DO NOTHING / idempotent UPDATEs)
-- ============================================================

-- ─── Shop Settings ──────────────────────────────────────────
UPDATE public.shop_settings SET
  shop_name  = 'Goyal Traders',
  address    = '12, Paint Market, Near Railway Station, Civil Lines',
  phone      = '9876500001',
  email      = 'ankitjain@goyaltraders.in',
  tax_number = '03AAAAA0000A1Z5',
  tax_rate   = 0,
  currency   = 'INR'
WHERE id = 1;

-- ─── Products — JSW Paints ──────────────────────────────────
INSERT INTO public.products (id, name, sku, brand, color, category, price, unit, description) VALUES
  ('e5000001-0000-0000-0000-000000000001', 'JSW Interior Emulsion (2-Year Warranty)', 'JSW-INT-EM-10L', 'JSW Paints', 'White Base', 'Interior Paint', 1850.00, 'tin (10L)', '2-year warranty interior emulsion, smooth matt finish, washable'),
  ('e5000001-0000-0000-0000-000000000002', 'JSW Exterior Acrylic (4-Year Warranty)', 'JSW-EXT-AC-10L', 'JSW Paints', 'White Base', 'Exterior Paint', 2400.00, 'tin (10L)', '4-year warranty exterior acrylic, weather-resistant, UV stable'),
  ('e5000001-0000-0000-0000-000000000003', 'JSW Premium Royale (6-Year Warranty)', 'JSW-ROY-PR-10L', 'JSW Paints', 'White Base', 'Interior Paint', 3200.00, 'tin (10L)', 'Premium 6-year warranty luxury emulsion, silk finish, anti-fungal'),
  ('e5000001-0000-0000-0000-000000000004', 'JSW Primer Coat',                         'JSW-PRI-10L',   'JSW Paints', 'White',      'Primer',         950.00, 'tin (10L)', 'Interior & exterior primer, improves adhesion and coverage'),
  ('e5000001-0000-0000-0000-000000000005', 'JSW Waterproof Exterior Paint',            'JSW-WP-EXT-10L','JSW Paints', 'White Base', 'Exterior Paint', 2800.00, 'tin (10L)', 'Waterproof exterior paint with hydrophobic coating')
ON CONFLICT (id) DO NOTHING;

-- ─── Products — Birla Opus ──────────────────────────────────
INSERT INTO public.products (id, name, sku, brand, color, category, price, unit, description) VALUES
  ('e5000002-0000-0000-0000-000000000001', 'Birla Opus Interior Paint',    'BOP-INT-10L',    'Birla Opus', 'White Base', 'Interior Paint',  1750.00, 'tin (10L)',    'Interior emulsion with rich pigmentation, easy application'),
  ('e5000002-0000-0000-0000-000000000002', 'Birla Opus Exterior Paint',    'BOP-EXT-10L',    'Birla Opus', 'White Base', 'Exterior Paint',  2300.00, 'tin (10L)',    'Weather-shield exterior paint, crack-bridging technology'),
  ('e5000002-0000-0000-0000-000000000003', 'Birla Opus Wall Putty',        'BOP-PUT-20KG',   'Birla Opus', 'White',      'Wall Putty',       650.00, 'bag (20kg)',   'Smooth white putty for walls, prevents dampness'),
  ('e5000002-0000-0000-0000-000000000004', 'Birla Opus Primer',            'BOP-PRI-10L',    'Birla Opus', 'White',      'Primer',           900.00, 'tin (10L)',    'Universal primer, reduces topcoat consumption'),
  ('e5000002-0000-0000-0000-000000000005', 'Birla Opus Rustic Texture',    'BOP-TEX-10L',    'Birla Opus', 'Natural',    'Texture Paint',   3500.00, 'bucket (10L)', 'Decorative rustic texture finish for feature walls')
ON CONFLICT (id) DO NOTHING;

-- ─── Products — Nerolac, Asian Paints, Berger, Others ───────
INSERT INTO public.products (id, name, sku, brand, color, category, price, unit, description) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Impressions HD Interior Emulsion', 'NRL-INT-HD-20L', 'Nerolac',     'White Base', 'Interior Paint',  4800.00, 'tin (20L)', 'Premium HD finish interior emulsion, smooth sheen'),
  ('a1000001-0000-0000-0000-000000000002', 'Royale Shyne Luxury Emulsion',     'ASN-INT-RS-20L', 'Asian Paints','White Base', 'Interior Paint',  5200.00, 'tin (20L)', 'Luxury silk-like finish, anti-bacterial, low VOC'),
  ('a1000001-0000-0000-0000-000000000003', 'Silk Breatheasy Interior Paint',   'BGR-INT-SLK-20L','Berger',      'White Base', 'Interior Paint',  3800.00, 'tin (20L)', 'High-sheen washable interior, anti-fungal'),
  ('a1000001-0000-0000-0000-000000000004', 'Excel Total Exterior Emulsion',    'NRL-EXT-XL-20L', 'Nerolac',     'White Base', 'Exterior Paint',  4200.00, 'tin (20L)', 'Long-lasting exterior emulsion with crack-bridging'),
  ('a1000001-0000-0000-0000-000000000005', 'Apex Ultima Exterior Paint',       'ASN-EXT-APX-20L','Asian Paints','White Base', 'Exterior Paint',  4600.00, 'tin (20L)', '10-year warranty, SuperShield technology'),
  ('a1000001-0000-0000-0000-000000000006', 'WeatherCoat All Guard Exterior',   'BGR-EXT-WC-20L', 'Berger',      'White Base', 'Exterior Paint',  3600.00, 'tin (20L)', 'Weather-resistant exterior emulsion, UV-stable'),
  ('a1000001-0000-0000-0000-000000000007', 'Beauty Gold Interior Emulsion',    'NRL-INT-BG-20L', 'Nerolac',     'White Base', 'Economy Paint',   2400.00, 'tin (20L)', 'Economy smooth matt, ideal for rental projects'),
  ('a1000001-0000-0000-0000-000000000008', 'Tractor Emulsion Interior',        'ASN-INT-TRA-20L','Asian Paints','White Base', 'Economy Paint',   2200.00, 'tin (20L)', 'Reliable economy emulsion, uniform coverage'),
  ('a1000001-0000-0000-0000-000000000009', 'Acrylic Wall Putty',               'ASN-PUT-WL-25KG','Asian Paints','White',      'Wall Putty',       520.00, 'bag (25kg)', 'Waterproof acrylic putty for smooth base'),
  ('a1000001-0000-0000-0000-000000000010', 'JK Wallmax Wall Putty',            'JK-PUT-WM-25KG', 'JK Cement',   'White',      'Wall Putty',       480.00, 'bag (25kg)', 'White cement putty for cracks and leveling'),
  ('a1000001-0000-0000-0000-000000000011', 'Impressions Interior Primer',      'NRL-PRI-INT-20L','Nerolac',     'White',      'Primer',          1800.00, 'tin (20L)', 'Alkali-resistant interior primer'),
  ('a1000001-0000-0000-0000-000000000012', 'Primer Sealer Interior',           'ASN-PRI-SL-20L', 'Asian Paints','White',      'Primer',          1900.00, 'tin (20L)', 'Stain-blocking interior sealer primer'),
  ('a1000001-0000-0000-0000-000000000013', 'Rust Stop Metal Primer',           'NRL-PRIM-MTL-4L','Nerolac',     'Red Oxide',  'Metal Paint',      780.00, 'tin (4L)',  'Anti-corrosion primer for metal'),
  ('a1000001-0000-0000-0000-000000000014', 'Bison Synthetic Enamel',           'BGR-ENA-BS-4L',  'Berger',      'White',      'Enamel',           680.00, 'tin (4L)',  'Hard gloss enamel for wood and metal'),
  ('a1000001-0000-0000-0000-000000000015', 'Easy Wash Washable Emulsion',      'NPL-INT-EW-20L', 'Nippon Paint','White Base', 'Interior Paint',  4400.00, 'tin (20L)', '10,000 scrub cycles, scrubbable interior'),
  -- Other items from spec
  ('a1000001-0000-0000-0000-000000000016', 'Wall Putty White Cement',          'WPC-PUT-20KG',   'Generic',     'White',      'Wall Putty',       600.00, 'bag (20kg)', 'Standard white cement putty, economical'),
  ('a1000001-0000-0000-0000-000000000017', 'Red Oxide Primer',                 'RED-OX-PRI-10L', 'Generic',     'Red Oxide',  'Primer',           800.00, 'tin (10L)', 'Anti-rust red oxide primer for metal surfaces'),
  ('a1000001-0000-0000-0000-000000000018', 'Enamel Oil Paint',                 'ENA-OIL-10L',    'Generic',     'White',      'Enamel',          1200.00, 'tin (10L)', 'Oil-based enamel for wood doors, windows'),
  ('a1000001-0000-0000-0000-000000000019', 'Rust Protection Paint',            'RUST-PROT-10L',  'Generic',     'Silver',     'Metal Paint',     1400.00, 'tin (10L)', 'Anti-corrosion paint for outdoor metal structures'),
  ('a1000001-0000-0000-0000-000000000020', 'Wood Polish (Clear)',              'WOOD-POL-500ML', 'Generic',     'Clear',      'Wood Finish',      500.00, 'bottle (500ml)', 'Clear wood polish for furniture and doors')
ON CONFLICT (id) DO NOTHING;

-- ─── Inventory (quantities auto-created by trigger; update levels) ──
-- JSW Paints inventory
UPDATE public.inventory SET quantity = 48, min_quantity = 12, location = 'Rack JSW-1' WHERE product_id = 'e5000001-0000-0000-0000-000000000001';
UPDATE public.inventory SET quantity = 35, min_quantity = 10, location = 'Rack JSW-2' WHERE product_id = 'e5000001-0000-0000-0000-000000000002';
UPDATE public.inventory SET quantity = 22, min_quantity = 8,  location = 'Rack JSW-3' WHERE product_id = 'e5000001-0000-0000-0000-000000000003';
UPDATE public.inventory SET quantity = 30, min_quantity = 10, location = 'Rack JSW-4' WHERE product_id = 'e5000001-0000-0000-0000-000000000004';
UPDATE public.inventory SET quantity = 18, min_quantity = 8,  location = 'Rack JSW-5' WHERE product_id = 'e5000001-0000-0000-0000-000000000005';
-- Birla Opus inventory
UPDATE public.inventory SET quantity = 40, min_quantity = 12, location = 'Rack BOP-1' WHERE product_id = 'e5000002-0000-0000-0000-000000000001';
UPDATE public.inventory SET quantity = 32, min_quantity = 10, location = 'Rack BOP-2' WHERE product_id = 'e5000002-0000-0000-0000-000000000002';
UPDATE public.inventory SET quantity = 70, min_quantity = 20, location = 'Rack BOP-3' WHERE product_id = 'e5000002-0000-0000-0000-000000000003';
UPDATE public.inventory SET quantity = 25, min_quantity = 10, location = 'Rack BOP-4' WHERE product_id = 'e5000002-0000-0000-0000-000000000004';
UPDATE public.inventory SET quantity = 14, min_quantity = 8,  location = 'Rack BOP-5' WHERE product_id = 'e5000002-0000-0000-0000-000000000005';
-- Other brands
UPDATE public.inventory SET quantity = 42, min_quantity = 10, location = 'Rack A1' WHERE product_id = 'a1000001-0000-0000-0000-000000000001';
UPDATE public.inventory SET quantity = 38, min_quantity = 10, location = 'Rack A2' WHERE product_id = 'a1000001-0000-0000-0000-000000000002';
UPDATE public.inventory SET quantity = 25, min_quantity = 8,  location = 'Rack A3' WHERE product_id = 'a1000001-0000-0000-0000-000000000003';
UPDATE public.inventory SET quantity = 30, min_quantity = 10, location = 'Rack B1' WHERE product_id = 'a1000001-0000-0000-0000-000000000004';
UPDATE public.inventory SET quantity = 22, min_quantity = 8,  location = 'Rack B2' WHERE product_id = 'a1000001-0000-0000-0000-000000000005';
UPDATE public.inventory SET quantity = 18, min_quantity = 8,  location = 'Rack B3' WHERE product_id = 'a1000001-0000-0000-0000-000000000006';
UPDATE public.inventory SET quantity = 55, min_quantity = 15, location = 'Rack C1' WHERE product_id = 'a1000001-0000-0000-0000-000000000007';
UPDATE public.inventory SET quantity = 60, min_quantity = 15, location = 'Rack C2' WHERE product_id = 'a1000001-0000-0000-0000-000000000008';
UPDATE public.inventory SET quantity = 80, min_quantity = 20, location = 'Rack D1' WHERE product_id = 'a1000001-0000-0000-0000-000000000009';
UPDATE public.inventory SET quantity = 95, min_quantity = 20, location = 'Rack D2' WHERE product_id = 'a1000001-0000-0000-0000-000000000010';
UPDATE public.inventory SET quantity = 7,  min_quantity = 10, location = 'Rack E1' WHERE product_id = 'a1000001-0000-0000-0000-000000000011';
UPDATE public.inventory SET quantity = 5,  min_quantity = 10, location = 'Rack E2' WHERE product_id = 'a1000001-0000-0000-0000-000000000012';
UPDATE public.inventory SET quantity = 3,  min_quantity = 8,  location = 'Rack F1' WHERE product_id = 'a1000001-0000-0000-0000-000000000013';
UPDATE public.inventory SET quantity = 14, min_quantity = 8,  location = 'Rack F2' WHERE product_id = 'a1000001-0000-0000-0000-000000000014';
UPDATE public.inventory SET quantity = 20, min_quantity = 10, location = 'Rack G1' WHERE product_id = 'a1000001-0000-0000-0000-000000000015';
UPDATE public.inventory SET quantity = 85, min_quantity = 20, location = 'Rack D3' WHERE product_id = 'a1000001-0000-0000-0000-000000000016';
UPDATE public.inventory SET quantity = 28, min_quantity = 10, location = 'Rack F3' WHERE product_id = 'a1000001-0000-0000-0000-000000000017';
UPDATE public.inventory SET quantity = 32, min_quantity = 10, location = 'Rack G2' WHERE product_id = 'a1000001-0000-0000-0000-000000000018';
UPDATE public.inventory SET quantity = 20, min_quantity = 8,  location = 'Rack G3' WHERE product_id = 'a1000001-0000-0000-0000-000000000019';
UPDATE public.inventory SET quantity = 45, min_quantity = 12, location = 'Rack H1' WHERE product_id = 'a1000001-0000-0000-0000-000000000020';

-- ─── Customers (original 8 + 5 new from spec) ───────────────
INSERT INTO public.customers (id, name, email, phone, address, city, notes) VALUES
  ('b2000001-0000-0000-0000-000000000001', 'Suresh Kumar Constructions', 'suresh@skbuilders.in',    '9876543201', '14, Industrial Area, Phase-2',          'Ludhiana',   'Bulk buyer. Prefers Nerolac. Pays by cheque.'),
  ('b2000001-0000-0000-0000-000000000002', 'Rajiv Home Builders',        'rajiv@rajivbuilders.com', '9876543202', '22, MG Road, Sector 5',                  'Chandigarh', 'Regular customer. Multiple residential projects. Prefers Asian Paints.'),
  ('b2000001-0000-0000-0000-000000000003', 'Priya Interiors & Decor',    'priya@priyainteriors.com','9856234110', 'Shop 7, Furniture Market',               'Amritsar',   'Interior designer. Premium paints. Pays promptly by UPI.'),
  ('b2000001-0000-0000-0000-000000000004', 'Modern Construction Works',  'billing@modernconst.in',  '9822341098', '88, Jawahar Nagar',                      'Ludhiana',   'Large contractor. Govt projects. Payment sometimes 30-45 days delayed.'),
  ('b2000001-0000-0000-0000-000000000005', 'Anand Painting Services',    'anand.paint@gmail.com',   '9711234567', '3, Gandhi Street, Near Bus Stand',       'Patiala',    'Small contractor. Buys frequently. Cash preferred.'),
  ('b2000001-0000-0000-0000-000000000006', 'Sharma Renovations',         'sharma.reno@yahoo.com',   '9801122334', 'B-12, Old Housing Board Colony',         'Jalandhar',  'Renovation contractor. Exterior paints and primers.'),
  ('b2000001-0000-0000-0000-000000000007', 'City Developers Pvt Ltd',    'accounts@citydevelopers.in','9900112233','301, Corporate Tower, Ring Road',       'Ludhiana',   'Corporate client. Large-volume orders. 30-day credit.'),
  ('b2000001-0000-0000-0000-000000000008', 'K.S. Contractors',           'ks.contract@gmail.com',   '9644321789', '56-B, Transport Nagar',                  'Amritsar',   'Small contractor. Interior work. Reliable payer.'),
  -- New customers from spec
  ('b2000002-0000-0000-0000-000000000001', 'Ramesh Verma',               'ramesh.verma@gmail.com',  '9876100001', '45, Subhash Nagar, Near Temple',         'Ludhiana',   'Cash buyer. Buys JSW Paints for home projects. Reliable.'),
  ('b2000002-0000-0000-0000-000000000002', 'Suresh Yadav',               'suresh.yadav@gmail.com',  '9876100002', '12, Ram Nagar Colony, Sector 8',         'Chandigarh', 'UPI buyer. Prefers Birla Opus brand for his contractor work.'),
  ('b2000002-0000-0000-0000-000000000003', 'Mohan Sharma',               'mohan.sharma@yahoo.com',  '9876100003', '78, Civil Lines, Near Court',            'Ludhiana',   'Pays by cheque. Buys enamel and rust paint for industrial work.'),
  ('b2000002-0000-0000-0000-000000000004', 'Anita Devi',                 'anita.devi@gmail.com',    '9876100004', '23, Shastri Nagar, Old City',            'Amritsar',   'Partial payer (50%). JSW Premium for her home renovation.'),
  ('b2000002-0000-0000-0000-000000000005', 'Vikram Singh',               'vikram.contractor@gmail.com','9876100005','101, Transport Nagar, GT Road',        'Jalandhar',  'Large contractor. Bulk orders for multiple projects. UPI payment.')
ON CONFLICT (id) DO NOTHING;

-- ─── Bills (original 20 + 5 new from spec) ──────────────────
-- Note: tax_rate=0 for new bills so trigger calculates exact totals from items.
INSERT INTO public.bills (id, customer_id, bill_number, date, due_date, status, tax_rate, subtotal, tax, total, notes) VALUES
  -- ── Original bills (Jan–Jun 2026) ──
  ('c3000001-0000-0000-0000-000000000001','b2000001-0000-0000-0000-000000000001','BILL-000101','2026-01-08','2026-01-23','paid',    0,0,0,0,'Interior painting — 3BHK project Sector 12'),
  ('c3000001-0000-0000-0000-000000000002','b2000001-0000-0000-0000-000000000004','BILL-000102','2026-01-14','2026-01-29','paid',    0,0,0,0,'Govt school exterior painting project'),
  ('c3000001-0000-0000-0000-000000000003','b2000001-0000-0000-0000-000000000007','BILL-000103','2026-01-20','2026-02-19','paid',    0,0,0,0,'Tower A & B interior — Phase 1 supply'),
  ('c3000001-0000-0000-0000-000000000004','b2000001-0000-0000-0000-000000000002','BILL-000104','2026-02-03','2026-02-18','paid',    0,0,0,0,'5 units residential painting — Chandigarh'),
  ('c3000001-0000-0000-0000-000000000005','b2000001-0000-0000-0000-000000000003','BILL-000105','2026-02-11','2026-02-26','paid',    0,0,0,0,'Luxury villa interior — Amritsar'),
  ('c3000001-0000-0000-0000-000000000006','b2000001-0000-0000-0000-000000000006','BILL-000106','2026-02-18','2026-03-05','paid',    0,0,0,0,'Exterior repaint — 12 flats renovation'),
  ('c3000001-0000-0000-0000-000000000007','b2000001-0000-0000-0000-000000000001','BILL-000107','2026-03-05','2026-03-20','paid',    0,0,0,0,'Commercial office block interior — Phase 1'),
  ('c3000001-0000-0000-0000-000000000008','b2000001-0000-0000-0000-000000000005','BILL-000108','2026-03-10','2026-03-25','paid',    0,0,0,0,'Small contractor supply — 10 tins assorted'),
  ('c3000001-0000-0000-0000-000000000009','b2000001-0000-0000-0000-000000000007','BILL-000109','2026-03-22','2026-04-21','paid',    0,0,0,0,'Tower C interior painting — Phase 2 supply'),
  ('c3000001-0000-0000-0000-000000000010','b2000001-0000-0000-0000-000000000004','BILL-000110','2026-04-02','2026-04-17','paid',    0,0,0,0,'Municipal school painting project — final lot'),
  ('c3000001-0000-0000-0000-000000000011','b2000001-0000-0000-0000-000000000002','BILL-000111','2026-04-14','2026-04-29','paid',    0,0,0,0,'Residential township — 10 units exterior'),
  ('c3000001-0000-0000-0000-000000000012','b2000001-0000-0000-0000-000000000008','BILL-000112','2026-04-25','2026-05-10','paid',    0,0,0,0,'Interior renovation — 4 flats Amritsar'),
  ('c3000001-0000-0000-0000-000000000013','b2000001-0000-0000-0000-000000000003','BILL-000113','2026-05-05','2026-05-20','paid',    0,0,0,0,'Boutique hotel interior decor — premium paints'),
  ('c3000001-0000-0000-0000-000000000014','b2000001-0000-0000-0000-000000000007','BILL-000114','2026-05-18','2026-06-17','overdue', 0,0,0,0,'Tower D & E — large supply, credit 30 days'),
  ('c3000001-0000-0000-0000-000000000015','b2000001-0000-0000-0000-000000000001','BILL-000115','2026-05-26','2026-06-10','overdue', 0,0,0,0,'New industrial shed — exterior coat'),
  ('c3000001-0000-0000-0000-000000000016','b2000001-0000-0000-0000-000000000006','BILL-000116','2026-06-02','2026-06-17','sent',    0,0,0,0,'Exterior recoat — 20 apartments Jalandhar'),
  ('c3000001-0000-0000-0000-000000000017','b2000001-0000-0000-0000-000000000002','BILL-000117','2026-06-10','2026-06-25','sent',    0,0,0,0,'New project — 8 villas interior, Phase 1'),
  ('c3000001-0000-0000-0000-000000000018','b2000001-0000-0000-0000-000000000005','BILL-000118','2026-06-20','2026-07-05','draft',   0,0,0,0,'Quarterly supply — small contractor'),
  ('c3000001-0000-0000-0000-000000000019','b2000001-0000-0000-0000-000000000004','BILL-000119','2026-06-25','2026-07-10','draft',   0,0,0,0,'Proposed hospital wing painting — pending approval'),
  ('c3000001-0000-0000-0000-000000000020','b2000001-0000-0000-0000-000000000008','BILL-000120','2026-06-27','2026-07-12','draft',   0,0,0,0,'Interior + enamel work — 6 shops Amritsar'),
  -- ── 5 New bills from spec (JSW / Birla Opus customers) ──
  ('c3000002-0000-0000-0000-000000000001','b2000002-0000-0000-0000-000000000001','BILL-000201','2026-06-05','2026-06-20','paid',    0,0,0,0,'JSW Interior Emulsion + Primer — home renovation'),
  ('c3000002-0000-0000-0000-000000000002','b2000002-0000-0000-0000-000000000002','BILL-000202','2026-06-08','2026-06-23','paid',    0,0,0,0,'Birla Opus Exterior supply — contractor project'),
  ('c3000002-0000-0000-0000-000000000003','b2000002-0000-0000-0000-000000000003','BILL-000203','2026-06-12','2026-06-27','sent',    0,0,0,0,'Enamel + Rust Paint — industrial painting (cheque pending)'),
  ('c3000002-0000-0000-0000-000000000004','b2000002-0000-0000-0000-000000000004','BILL-000204','2026-06-15','2026-06-30','sent',    0,0,0,0,'JSW Premium Royale + Primer — 50% advance received'),
  ('c3000002-0000-0000-0000-000000000005','b2000002-0000-0000-0000-000000000005','BILL-000205','2026-06-20','2026-07-05','sent',    0,0,0,0,'Bulk contractor order — multiple brands, 30000 advance paid')
ON CONFLICT (id) DO NOTHING;

-- ─── Bill Items (original bills) ────────────────────────────
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000001-0000-0000-0000-000000000001','a1000001-0000-0000-0000-000000000001',20,4800),
  ('c3000001-0000-0000-0000-000000000001','a1000001-0000-0000-0000-000000000011', 5,1800),
  ('c3000001-0000-0000-0000-000000000001','a1000001-0000-0000-0000-000000000009',10, 520),
  ('c3000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000004',30,4200),
  ('c3000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000010',20, 480),
  ('c3000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000011', 8,1800),
  ('c3000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000002',40,5200),
  ('c3000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000012',10,1900),
  ('c3000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000009',25, 520),
  ('c3000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000002',15,5200),
  ('c3000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000005',10,4600),
  ('c3000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000009',12, 520),
  ('c3000001-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000015',12,4400),
  ('c3000001-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000002', 8,5200),
  ('c3000001-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000014', 6, 680),
  ('c3000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000006',20,3600),
  ('c3000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000010',15, 480),
  ('c3000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000013', 4, 780),
  ('c3000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000001',25,4800),
  ('c3000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000003',10,3800),
  ('c3000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000011', 6,1800),
  ('c3000001-0000-0000-0000-000000000008','a1000001-0000-0000-0000-000000000007', 6,2400),
  ('c3000001-0000-0000-0000-000000000008','a1000001-0000-0000-0000-000000000008', 4,2200),
  ('c3000001-0000-0000-0000-000000000008','a1000001-0000-0000-0000-000000000010', 5, 480),
  ('c3000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000002',50,5200),
  ('c3000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000012',12,1900),
  ('c3000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000009',30, 520),
  ('c3000001-0000-0000-0000-000000000010','a1000001-0000-0000-0000-000000000005',18,4600),
  ('c3000001-0000-0000-0000-000000000010','a1000001-0000-0000-0000-000000000006',12,3600),
  ('c3000001-0000-0000-0000-000000000010','a1000001-0000-0000-0000-000000000010',20, 480),
  ('c3000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000005',20,4600),
  ('c3000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000004',15,4200),
  ('c3000001-0000-0000-0000-000000000011','a1000001-0000-0000-0000-000000000009',18, 520),
  ('c3000001-0000-0000-0000-000000000012','a1000001-0000-0000-0000-000000000003',12,3800),
  ('c3000001-0000-0000-0000-000000000012','a1000001-0000-0000-0000-000000000010', 8, 480),
  ('c3000001-0000-0000-0000-000000000012','a1000001-0000-0000-0000-000000000014', 4, 680),
  ('c3000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000015',16,4400),
  ('c3000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000002',10,5200),
  ('c3000001-0000-0000-0000-000000000013','a1000001-0000-0000-0000-000000000014', 8, 680),
  ('c3000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000002',60,5200),
  ('c3000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000001',30,4800),
  ('c3000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000012',15,1900),
  ('c3000001-0000-0000-0000-000000000014','a1000001-0000-0000-0000-000000000009',40, 520),
  ('c3000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000004',22,4200),
  ('c3000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000013', 8, 780),
  ('c3000001-0000-0000-0000-000000000015','a1000001-0000-0000-0000-000000000010',10, 480),
  ('c3000001-0000-0000-0000-000000000016','a1000001-0000-0000-0000-000000000006',25,3600),
  ('c3000001-0000-0000-0000-000000000016','a1000001-0000-0000-0000-000000000004',15,4200),
  ('c3000001-0000-0000-0000-000000000016','a1000001-0000-0000-0000-000000000010',18, 480),
  ('c3000001-0000-0000-0000-000000000017','a1000001-0000-0000-0000-000000000002',20,5200),
  ('c3000001-0000-0000-0000-000000000017','a1000001-0000-0000-0000-000000000009',16, 520),
  ('c3000001-0000-0000-0000-000000000017','a1000001-0000-0000-0000-000000000012', 6,1900),
  ('c3000001-0000-0000-0000-000000000018','a1000001-0000-0000-0000-000000000007', 8,2400),
  ('c3000001-0000-0000-0000-000000000018','a1000001-0000-0000-0000-000000000008', 6,2200),
  ('c3000001-0000-0000-0000-000000000018','a1000001-0000-0000-0000-000000000010', 4, 480),
  ('c3000001-0000-0000-0000-000000000019','a1000001-0000-0000-0000-000000000001',35,4800),
  ('c3000001-0000-0000-0000-000000000019','a1000001-0000-0000-0000-000000000005',20,4600),
  ('c3000001-0000-0000-0000-000000000019','a1000001-0000-0000-0000-000000000011',10,1800),
  ('c3000001-0000-0000-0000-000000000019','a1000001-0000-0000-0000-000000000009',20, 520),
  ('c3000001-0000-0000-0000-000000000020','a1000001-0000-0000-0000-000000000003', 8,3800),
  ('c3000001-0000-0000-0000-000000000020','a1000001-0000-0000-0000-000000000014',10, 680),
  ('c3000001-0000-0000-0000-000000000020','a1000001-0000-0000-0000-000000000009', 6, 520)
ON CONFLICT DO NOTHING;

-- ─── Bill Items (new 5 bills — from spec, tax_rate=0 so totals = subtotals) ──
-- BILL-000201 Ramesh Verma: JSW Interior 10 × 1850 + JSW Primer 4 × 1000 = 22,500
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000002-0000-0000-0000-000000000001','e5000001-0000-0000-0000-000000000001',10,1850),
  ('c3000002-0000-0000-0000-000000000001','e5000001-0000-0000-0000-000000000004', 4,1000)
ON CONFLICT DO NOTHING;

-- BILL-000202 Suresh Yadav: Birla Opus Exterior 8 × 2300 = 18,400
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000002-0000-0000-0000-000000000002','e5000002-0000-0000-0000-000000000002', 8,2300)
ON CONFLICT DO NOTHING;

-- BILL-000203 Mohan Sharma: Enamel 5 × 1200 + Rust Paint 3 × 1400 + Wall Putty 3 × 600 = 12,000
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000002-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000018', 5,1200),
  ('c3000002-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000019', 3,1400),
  ('c3000002-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000016', 3, 600)
ON CONFLICT DO NOTHING;

-- BILL-000204 Anita Devi: JSW Premium Royale 5 × 3200 + JSW Primer 4 × 1000 = 20,000
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000002-0000-0000-0000-000000000004','e5000001-0000-0000-0000-000000000003', 5,3200),
  ('c3000002-0000-0000-0000-000000000004','e5000001-0000-0000-0000-000000000004', 4,1000)
ON CONFLICT DO NOTHING;

-- BILL-000205 Vikram Singh: bulk order ~55,000
INSERT INTO public.bill_items (bill_id, product_id, quantity, unit_price) VALUES
  ('c3000002-0000-0000-0000-000000000005','e5000001-0000-0000-0000-000000000002',10,2400),
  ('c3000002-0000-0000-0000-000000000005','e5000001-0000-0000-0000-000000000003', 6,3200),
  ('c3000002-0000-0000-0000-000000000005','e5000002-0000-0000-0000-000000000002', 8,2300),
  ('c3000002-0000-0000-0000-000000000005','e5000002-0000-0000-0000-000000000001', 5,1750),
  ('c3000002-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000016',10, 600),
  ('c3000002-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000017', 3, 800)
ON CONFLICT DO NOTHING;

-- ─── Payments ───────────────────────────────────────────────
INSERT INTO public.payments (id, customer_id, bill_id, amount, payment_method, payment_date, notes) VALUES
  -- Original paid bills
  ('d4000001-0000-0000-0000-000000000001','b2000001-0000-0000-0000-000000000001','c3000001-0000-0000-0000-000000000001',121600.00,'cheque',       '2026-01-22','Cheque #004521, HDFC Bank'),
  ('d4000001-0000-0000-0000-000000000002','b2000001-0000-0000-0000-000000000004','c3000001-0000-0000-0000-000000000002',167688.00,'bank_transfer', '2026-01-28','NEFT from Punjab National Bank'),
  ('d4000001-0000-0000-0000-000000000003','b2000001-0000-0000-0000-000000000007','c3000001-0000-0000-0000-000000000003',333020.00,'cheque',       '2026-02-15','Cheque #009988 — City Developers'),
  ('d4000001-0000-0000-0000-000000000004','b2000001-0000-0000-0000-000000000002','c3000001-0000-0000-0000-000000000004',178956.00,'bank_transfer', '2026-02-17','IMPS transfer Rajiv Builders'),
  ('d4000001-0000-0000-0000-000000000005','b2000001-0000-0000-0000-000000000003','c3000001-0000-0000-0000-000000000005',133928.00,'upi',          '2026-02-25','UPI — priyainteriors@ybl'),
  ('d4000001-0000-0000-0000-000000000006','b2000001-0000-0000-0000-000000000006','c3000001-0000-0000-0000-000000000006', 98060.40,'upi',          '2026-03-04','UPI — sharmareno@okicici'),
  ('d4000001-0000-0000-0000-000000000007','b2000001-0000-0000-0000-000000000001','c3000001-0000-0000-0000-000000000007',214924.00,'cheque',       '2026-03-19','Cheque #005102 — Suresh Kumar'),
  ('d4000001-0000-0000-0000-000000000008','b2000001-0000-0000-0000-000000000005','c3000001-0000-0000-0000-000000000008', 36466.00,'cash',         '2026-03-24','Cash collected from Anand'),
  ('d4000001-0000-0000-0000-000000000009','b2000001-0000-0000-0000-000000000007','c3000001-0000-0000-0000-000000000009',425380.00,'cheque',       '2026-04-18','Cheque #010231 — City Developers Phase 2'),
  ('d4000001-0000-0000-0000-000000000010','b2000001-0000-0000-0000-000000000004','c3000001-0000-0000-0000-000000000010',209508.00,'bank_transfer', '2026-04-16','RTGS from Jawahar Nagar account'),
  ('d4000001-0000-0000-0000-000000000011','b2000001-0000-0000-0000-000000000002','c3000001-0000-0000-0000-000000000011',280772.00,'bank_transfer', '2026-04-28','NEFT from Rajiv Builders'),
  ('d4000001-0000-0000-0000-000000000012','b2000001-0000-0000-0000-000000000008','c3000001-0000-0000-0000-000000000012', 60928.40,'cash',         '2026-05-09','Cash received at counter'),
  ('d4000001-0000-0000-0000-000000000013','b2000001-0000-0000-0000-000000000003','c3000001-0000-0000-0000-000000000013',152432.00,'upi',          '2026-05-19','UPI — priyainteriors@ybl boutique hotel'),
  -- New bills payments
  ('d4000002-0000-0000-0000-000000000001','b2000002-0000-0000-0000-000000000001','c3000002-0000-0000-0000-000000000001', 22500.00,'cash',         '2026-06-05','Full cash payment — Ramesh Verma'),
  ('d4000002-0000-0000-0000-000000000002','b2000002-0000-0000-0000-000000000002','c3000002-0000-0000-0000-000000000002', 18400.00,'upi',          '2026-06-08','UPI payment — Suresh Yadav full'),
  -- Anita Devi: 50% advance (bill total = 20000, paid 10000)
  ('d4000002-0000-0000-0000-000000000004','b2000002-0000-0000-0000-000000000004','c3000002-0000-0000-0000-000000000004', 10000.00,'upi',          '2026-06-15','50% advance UPI — Anita Devi'),
  -- Vikram Singh: ₹30,000 advance on ₹55,000 bulk order
  ('d4000002-0000-0000-0000-000000000005','b2000002-0000-0000-0000-000000000005','c3000002-0000-0000-0000-000000000005', 30000.00,'upi',          '2026-06-20','Advance UPI ₹30,000 — Vikram Singh contractor')
ON CONFLICT (id) DO NOTHING;
