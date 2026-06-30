-- ============================================================
-- PaintFlow CRM — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ─── Enable RLS on all tables ───────────────────────────────
alter table public.profiles       enable row level security;
alter table public.shop_settings  enable row level security;
alter table public.customers      enable row level security;
alter table public.products       enable row level security;
alter table public.inventory      enable row level security;
alter table public.bills          enable row level security;
alter table public.bill_items     enable row level security;

-- ─── Profiles ───────────────────────────────────────────────
-- Users can read and update only their own profile
drop policy if exists "profiles: own read"   on public.profiles;
drop policy if exists "profiles: own update" on public.profiles;

create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Shop Settings ──────────────────────────────────────────
-- All authenticated users can read; only admins can write
drop policy if exists "shop_settings: auth read"   on public.shop_settings;
drop policy if exists "shop_settings: admin write" on public.shop_settings;

create policy "shop_settings: auth read"
  on public.shop_settings for select
  using (auth.role() = 'authenticated');

create policy "shop_settings: admin write"
  on public.shop_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── Customers ──────────────────────────────────────────────
-- All authenticated users can read, insert, update
-- Only admins can delete
drop policy if exists "customers: auth read"    on public.customers;
drop policy if exists "customers: auth insert"  on public.customers;
drop policy if exists "customers: auth update"  on public.customers;
drop policy if exists "customers: admin delete" on public.customers;

create policy "customers: auth read"
  on public.customers for select
  using (auth.role() = 'authenticated');

create policy "customers: auth insert"
  on public.customers for insert
  with check (auth.role() = 'authenticated');

create policy "customers: auth update"
  on public.customers for update
  using (auth.role() = 'authenticated');

create policy "customers: admin delete"
  on public.customers for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- ─── Products ───────────────────────────────────────────────
drop policy if exists "products: auth read"    on public.products;
drop policy if exists "products: auth insert"  on public.products;
drop policy if exists "products: auth update"  on public.products;
drop policy if exists "products: admin delete" on public.products;

create policy "products: auth read"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "products: auth insert"
  on public.products for insert
  with check (auth.role() = 'authenticated');

create policy "products: auth update"
  on public.products for update
  using (auth.role() = 'authenticated');

create policy "products: admin delete"
  on public.products for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- ─── Inventory ──────────────────────────────────────────────
drop policy if exists "inventory: auth read"   on public.inventory;
drop policy if exists "inventory: auth write"  on public.inventory;

create policy "inventory: auth read"
  on public.inventory for select
  using (auth.role() = 'authenticated');

create policy "inventory: auth write"
  on public.inventory for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── Bills ──────────────────────────────────────────────────
drop policy if exists "bills: auth read"    on public.bills;
drop policy if exists "bills: auth insert"  on public.bills;
drop policy if exists "bills: auth update"  on public.bills;
drop policy if exists "bills: admin delete" on public.bills;

create policy "bills: auth read"
  on public.bills for select
  using (auth.role() = 'authenticated');

create policy "bills: auth insert"
  on public.bills for insert
  with check (auth.role() = 'authenticated');

create policy "bills: auth update"
  on public.bills for update
  using (auth.role() = 'authenticated');

create policy "bills: admin delete"
  on public.bills for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- ─── Bill Items ─────────────────────────────────────────────
drop policy if exists "bill_items: auth read"   on public.bill_items;
drop policy if exists "bill_items: auth write"  on public.bill_items;

create policy "bill_items: auth read"
  on public.bill_items for select
  using (auth.role() = 'authenticated');

create policy "bill_items: auth write"
  on public.bill_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
