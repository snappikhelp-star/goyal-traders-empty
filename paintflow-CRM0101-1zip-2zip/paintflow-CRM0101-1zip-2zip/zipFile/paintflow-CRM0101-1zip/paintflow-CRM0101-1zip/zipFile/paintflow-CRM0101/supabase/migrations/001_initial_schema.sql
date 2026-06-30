-- ============================================================
-- PaintFlow CRM — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ───────────────────────────────────────────────
-- One profile per auth.users row; created automatically on signup
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'staff' check (role in ('admin', 'manager', 'staff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Shop Settings ──────────────────────────────────────────
-- Global settings, one row per deployment (id = 1)
create table if not exists public.shop_settings (
  id          integer primary key default 1 check (id = 1),
  shop_name   text not null default '',
  address     text,
  phone       text,
  email       text,
  tax_number  text,
  tax_rate    numeric(5,2) not null default 0,
  currency    text not null default 'USD',
  logo_url    text,
  updated_at  timestamptz not null default now()
);

-- Seed a single row so upserts always work
insert into public.shop_settings (id) values (1) on conflict do nothing;

-- ─── Customers ──────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text,
  phone       text,
  address     text,
  city        text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customers_name_idx on public.customers using gin (to_tsvector('english', name));

-- ─── Products ───────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  sku         text not null unique,
  brand       text,
  color       text,
  category    text not null,
  price       numeric(12,2) not null check (price >= 0),
  unit        text not null default 'liter',
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_sku_idx on public.products (sku);
create index if not exists products_category_idx on public.products (category);

-- ─── Inventory ──────────────────────────────────────────────
create table if not exists public.inventory (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.products(id) on delete cascade unique,
  quantity     numeric(12,3) not null default 0 check (quantity >= 0),
  min_quantity numeric(12,3) not null default 0 check (min_quantity >= 0),
  location     text,
  last_updated timestamptz not null default now()
);

-- Auto-create inventory row when a product is created
create or replace function public.handle_new_product()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (product_id)
  values (new.id)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_product_created on public.products;
create trigger on_product_created
  after insert on public.products
  for each row execute procedure public.handle_new_product();

-- ─── Bills ──────────────────────────────────────────────────
create table if not exists public.bills (
  id           uuid primary key default uuid_generate_v4(),
  customer_id  uuid not null references public.customers(id) on delete restrict,
  bill_number  text not null unique,
  date         date not null default current_date,
  due_date     date,
  status       text not null default 'draft'
               check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal     numeric(12,2) not null default 0,
  tax_rate     numeric(5,2) not null default 0,
  tax          numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bills_customer_id_idx on public.bills (customer_id);
create index if not exists bills_status_idx on public.bills (status);
create index if not exists bills_date_idx on public.bills (date desc);

-- Auto-generate bill numbers: BILL-000001, BILL-000002, …
create sequence if not exists public.bill_number_seq;

create or replace function public.generate_bill_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.bill_number is null or new.bill_number = '' then
    new.bill_number := 'BILL-' || lpad(nextval('public.bill_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_bill_number on public.bills;
create trigger set_bill_number
  before insert on public.bills
  for each row execute procedure public.generate_bill_number();

-- ─── Bill Items ─────────────────────────────────────────────
create table if not exists public.bill_items (
  id          uuid primary key default uuid_generate_v4(),
  bill_id     uuid not null references public.bills(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    numeric(12,3) not null check (quantity > 0),
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  total       numeric(12,2) not null generated always as (quantity * unit_price) stored
);

create index if not exists bill_items_bill_id_idx on public.bill_items (bill_id);

-- Recalculate bill totals when items change
create or replace function public.recalculate_bill_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_bill_id   uuid;
  v_subtotal  numeric(12,2);
  v_tax_rate  numeric(5,2);
  v_tax       numeric(12,2);
begin
  v_bill_id := coalesce(new.bill_id, old.bill_id);

  select coalesce(sum(total), 0)
  into v_subtotal
  from public.bill_items
  where bill_id = v_bill_id;

  select tax_rate into v_tax_rate from public.bills where id = v_bill_id;
  v_tax := round(v_subtotal * (v_tax_rate / 100), 2);

  update public.bills
  set subtotal   = v_subtotal,
      tax        = v_tax,
      total      = v_subtotal + v_tax,
      updated_at = now()
  where id = v_bill_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists recalculate_on_item_change on public.bill_items;
create trigger recalculate_on_item_change
  after insert or update or delete on public.bill_items
  for each row execute procedure public.recalculate_bill_totals();

-- ─── Updated-at triggers ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_profiles') then
    create trigger set_updated_at_profiles
      before update on public.profiles
      for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_customers') then
    create trigger set_updated_at_customers
      before update on public.customers
      for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_products') then
    create trigger set_updated_at_products
      before update on public.products
      for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_bills') then
    create trigger set_updated_at_bills
      before update on public.bills
      for each row execute procedure public.set_updated_at();
  end if;
end $$;
