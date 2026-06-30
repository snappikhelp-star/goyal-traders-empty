-- ============================================================
-- PaintFlow CRM — Customer Management Extended Schema
-- Run in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ─── Extend customers table ─────────────────────────────────
alter table public.customers
  add column if not exists alternate_mobile text,
  add column if not exists state            text,
  add column if not exists pincode          text,
  add column if not exists gst_number       text,
  add column if not exists birthday         date,
  add column if not exists anniversary      date;

-- Full-text search index on customers
create index if not exists customers_search_idx
  on public.customers
  using gin (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(alternate_mobile, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(gst_number, '')
    )
  );

create index if not exists customers_city_idx   on public.customers (city);
create index if not exists customers_state_idx  on public.customers (state);

-- ─── Customer Notes ─────────────────────────────────────────
create table if not exists public.customer_notes (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  content     text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id);

-- ─── Customer Photos ────────────────────────────────────────
create table if not exists public.customer_photos (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid not null references public.customers(id) on delete cascade,
  url              text not null,
  caption          text,
  house_mapping_id uuid,
  created_at       timestamptz not null default now()
);

create index if not exists customer_photos_customer_idx on public.customer_photos (customer_id);

-- ─── House Mappings ─────────────────────────────────────────
create table if not exists public.house_mappings (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  property_name text not null,
  address       text,
  property_type text default 'residential'
                check (property_type in ('residential', 'commercial', 'office', 'shop', 'other')),
  area_sqft     numeric(10,2),
  rooms         integer,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists house_mappings_customer_idx on public.house_mappings (customer_id);

-- Add FK for customer_photos.house_mapping_id after house_mappings is created
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'customer_photos_house_mapping_id_fkey'
  ) then
    alter table public.customer_photos
      add constraint customer_photos_house_mapping_id_fkey
      foreign key (house_mapping_id)
      references public.house_mappings(id) on delete set null;
  end if;
end $$;

-- ─── Customer Paint Shades ──────────────────────────────────
create table if not exists public.customer_paint_shades (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid not null references public.customers(id) on delete cascade,
  house_mapping_id uuid references public.house_mappings(id) on delete set null,
  brand            text,
  shade_name       text not null,
  shade_code       text,
  room_area        text,
  applied_date     date,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists customer_paint_shades_customer_idx on public.customer_paint_shades (customer_id);

-- ─── Payments ───────────────────────────────────────────────
create table if not exists public.payments (
  id             uuid primary key default uuid_generate_v4(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  bill_id        uuid references public.bills(id) on delete set null,
  amount         numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash'
                 check (payment_method in ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other')),
  payment_date   date not null default current_date,
  reference      text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists payments_customer_idx on public.payments (customer_id);
create index if not exists payments_bill_idx     on public.payments (bill_id);
create index if not exists payments_date_idx     on public.payments (payment_date desc);

-- ─── Updated-at triggers for new tables ─────────────────────
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_house_mappings') then
    create trigger set_updated_at_house_mappings
      before update on public.house_mappings
      for each row execute procedure public.set_updated_at();
  end if;
end $$;

-- ─── RLS on new tables ──────────────────────────────────────
alter table public.customer_notes       enable row level security;
alter table public.customer_photos      enable row level security;
alter table public.house_mappings       enable row level security;
alter table public.customer_paint_shades enable row level security;
alter table public.payments             enable row level security;

-- customer_notes
drop policy if exists "customer_notes: auth all" on public.customer_notes;
create policy "customer_notes: auth all"
  on public.customer_notes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- customer_photos
drop policy if exists "customer_photos: auth all" on public.customer_photos;
create policy "customer_photos: auth all"
  on public.customer_photos for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- house_mappings
drop policy if exists "house_mappings: auth all" on public.house_mappings;
create policy "house_mappings: auth all"
  on public.house_mappings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- customer_paint_shades
drop policy if exists "customer_paint_shades: auth all" on public.customer_paint_shades;
create policy "customer_paint_shades: auth all"
  on public.customer_paint_shades for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- payments
drop policy if exists "payments: auth all" on public.payments;
create policy "payments: auth all"
  on public.payments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
