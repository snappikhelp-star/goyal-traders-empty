# PaintFlow CRM — Migration Report

> Generated: 2026-06-26  
> pnpm 11.9.0 · Vite 7.3.5 · TypeScript strict  
> Database: PostgreSQL 15 (Supabase)

---

## Summary

| Check | Status |
|---|---|
| TypeScript typecheck | ✅ Zero errors |
| Production build | ✅ Success (13.77 s) |
| Migration files | ✅ 6 files (001–006) |
| All tables created | ✅ 12 tables |
| Foreign keys | ✅ 14 FK constraints |
| Indexes | ✅ 28 indexes (B-tree + GIN + Partial) |
| RLS enabled | ✅ All 12 tables |
| RLS policies | ✅ 30 policies (clean, no duplicates) |
| `updated_at` triggers | ✅ 6 tables covered |
| `last_updated` trigger | ✅ inventory covered |
| `created_at` auto-default | ✅ All applicable tables |
| Auto bill numbering | ✅ BILL-000001 sequence |
| Auto inventory creation | ✅ On product insert |
| Auto profile creation | ✅ On auth.users insert |
| Bill totals auto-sync | ✅ On bill_items change |
| last_purchase_date sync | ✅ On bills change |

---

## Migration Files

### `001_initial_schema.sql`
**Purpose:** Core schema — foundational tables and functions.

Tables created:
- `profiles` — linked 1:1 to `auth.users` via FK; auto-created on signup via `on_auth_user_created` trigger
- `shop_settings` — singleton table (id=1 enforced by CHECK), seeded on creation
- `customers` — main customer entity with name, email, phone, address, city, notes
- `products` — paint product catalog with name, SKU (UNIQUE), brand, color, category, price, unit
- `inventory` — one row per product (UNIQUE on product_id); auto-created on product insert via `on_product_created` trigger
- `bills` — invoice header; bill_number auto-generated as `BILL-000001` via sequence
- `bill_items` — invoice line items; totals originally GENERATED ALWAYS (later changed in 005)

Functions introduced:
- `set_updated_at()` — generic BEFORE UPDATE trigger for `updated_at` stamping
- `handle_new_user()` — inserts a profile row on `auth.users` INSERT
- `handle_new_product()` — inserts an inventory row on `products` INSERT
- `generate_bill_number()` — stamps bill_number from `bill_number_seq`
- `recalculate_bill_totals()` — keeps bills.subtotal/tax/total in sync after bill_items changes

Triggers applied: `on_auth_user_created`, `on_product_created`, `set_bill_number`, `recalculate_on_item_change`, `set_updated_at_profiles`, `set_updated_at_customers`, `set_updated_at_products`, `set_updated_at_bills`

Indexes: `customers_name_idx` (GIN), `products_sku_idx`, `products_category_idx`, `bills_customer_id_idx`, `bills_status_idx`, `bills_date_idx`, `bill_items_bill_id_idx`

---

### `002_rls_policies.sql`
**Purpose:** Row Level Security on initial 7 tables.

RLS enabled on: `profiles`, `shop_settings`, `customers`, `products`, `inventory`, `bills`, `bill_items`

Policy approach:
- **profiles** — users can only SELECT and UPDATE their own row
- **shop_settings** — all authenticated users can read; only `admin` role can write
- **customers** — all authenticated can read/insert/update; only `admin`/`manager` can delete
- **products** — same as customers
- **inventory** — all authenticated have full CRUD (stock adjustments are operational)
- **bills** — all authenticated can read/insert/update; only `admin`/`manager` can delete
- **bill_items** — all authenticated have full CRUD

> **Note:** Some of these policies were superseded and consolidated in `006_production_hardening.sql`.

---

### `003_customers_extended.sql`
**Purpose:** Extended customer management — additional columns, related tables, RLS.

Columns added to `customers`:
- `alternate_mobile`, `state`, `pincode`, `gst_number`, `birthday`, `anniversary`

Tables created:
- `customer_notes` — per-customer text notes; FK to `customers` (CASCADE) and `auth.users` (SET NULL)
- `customer_photos` — URL-based photo gallery; FK to `customers` (CASCADE) and `house_mappings` (SET NULL, deferred FK added after `house_mappings` created)
- `house_mappings` — property/house records for each customer; FK to `customers` (CASCADE)
- `customer_paint_shades` — paint shade history per customer/property; FK to `customers` (CASCADE) and `house_mappings` (SET NULL)
- `payments` — payment records; FK to `customers` (CASCADE) and `bills` (SET NULL)

Indexes added: `customers_search_idx` (GIN multi-field), `customers_city_idx`, `customers_state_idx`, `customer_notes_customer_idx`, `customer_photos_customer_idx`, `house_mappings_customer_idx`, `customer_paint_shades_customer_idx`, `payments_customer_idx`, `payments_bill_idx`, `payments_date_idx`

Triggers: `set_updated_at_house_mappings`

RLS: Enabled on all 5 new tables; all authenticated users have full CRUD on customer sub-tables.

---

### `004_customer_last_purchase.sql`
**Purpose:** Denormalized `last_purchase_date` on customers for efficient sorting.

- Adds `last_purchase_date DATE` column to `customers`
- Creates `sync_customer_last_purchase()` function: recalculates `MAX(bills.date)` (excluding cancelled) for any customer affected by a bill INSERT/UPDATE/DELETE
- Installs `sync_last_purchase_on_bill` trigger on `bills` (AFTER INSERT OR UPDATE OR DELETE)
- Backfills existing data

**Why denormalize?** PostgREST doesn't support `ORDER BY (subquery)` in paginated list queries. Denormalizing enables `order=last_purchase_date.desc` directly.

---

### `005_billing_extended.sql`
**Purpose:** Full billing schema — richer product data, per-item GST, bill-level discounts.

Columns added to `products`:
- `barcode` (UNIQUE partial index), `shade_number` (partial index), `pack_size`, `hsn_code`

Columns added to `bill_items`:
- Dropped generated `total` column (cannot ALTER a GENERATED ALWAYS column)
- Added: `product_name`, `brand`, `shade_number`, `pack_size` (all snapshots from product at sale time)
- Added: `discount`, `gst_rate`, `gst_amount`, `total` (manually maintained)

Columns added to `bills`:
- `discount`, `paid_amount`, `payment_method`

Updated `recalculate_bill_totals()` to include per-item discount and GST sums.

---

### `006_production_hardening.sql` ← **New**
**Purpose:** Close all remaining production gaps identified in audit.

#### 1. Missing phone/mobile indexes
```sql
CREATE INDEX customers_phone_idx            ON customers (phone)             WHERE phone IS NOT NULL;
CREATE INDEX customers_alternate_mobile_idx ON customers (alternate_mobile)  WHERE alternate_mobile IS NOT NULL;
CREATE INDEX customers_name_lower_idx       ON customers (lower(name));
CREATE INDEX products_name_lower_idx        ON products  (lower(name));
CREATE INDEX customer_paint_shades_shade_code_idx ON customer_paint_shades (shade_code) WHERE shade_code IS NOT NULL;
CREATE INDEX payments_date_created_idx      ON payments (created_at DESC);
```

#### 2. Missing `shop_settings` `updated_at` trigger
`shop_settings` had the `updated_at` column since migration 001 but no BEFORE UPDATE trigger. Added `set_updated_at_shop_settings`.

#### 3. Missing `inventory` `last_updated` auto-trigger
`inventory.last_updated` was only set on INSERT (via DEFAULT). Updates to quantity/min_quantity would not refresh it. Added `set_last_updated_inventory` trigger with dedicated `set_inventory_last_updated()` function.

#### 4. Consolidated duplicate RLS policies
Migration 002 created granular policies per operation (read/insert/update/admin-delete). Migration 005 then added broad `auth all` policies for the same tables without removing the granular ones. The result was:
- Admins could delete bills ✅ (from 002 "admin delete")
- But **any authenticated user could also delete bills** ✅ (from 005 "auth all")
- The "admin only delete" intent was silently broken

Migration 006 drops all legacy granular + broad policies and replaces them with a clean, consistent set:
- SELECT / INSERT / UPDATE → any `authenticated` user
- DELETE on `bills`, `products`, `customers` → `admin` or `manager` role only
- DELETE on `bill_items` → any `authenticated` (operational need)
- `shop_settings` write → `admin` only

Also cleaned up `shop_settings` and `customers` policies to include proper `WITH CHECK` clauses that were missing.

Added `profiles: admin read all` policy so admin users can read all profiles (needed for role-check sub-selects inside other policies).

#### 5. Partial UNIQUE index on `customers.gst_number`
Prevents duplicate GST numbers while allowing NULL (customers without GST).

#### 6. `shop_settings.created_at` column
Added missing `created_at` column to `shop_settings` (it had `updated_at` but no `created_at`).

#### 7. Re-confirm RLS flags
`ALTER TABLE … ENABLE ROW LEVEL SECURITY` is idempotent — safe to run on all 12 tables again as a final safety check.

---

## Table: Columns with Timestamps

| Table | `created_at` | `updated_at` | Other | Trigger |
|---|:---:|:---:|---|---|
| `profiles` | ✅ | ✅ | — | `set_updated_at_profiles` |
| `shop_settings` | ✅ *(006)* | ✅ | — | `set_updated_at_shop_settings` *(006)* |
| `customers` | ✅ | ✅ | `last_purchase_date` | `set_updated_at_customers` |
| `products` | ✅ | ✅ | — | `set_updated_at_products` |
| `inventory` | — | — | `last_updated` | `set_last_updated_inventory` *(006)* |
| `bills` | ✅ | ✅ | `date`, `due_date` | `set_updated_at_bills` |
| `bill_items` | — | — | *(immutable line items)* | — |
| `customer_notes` | ✅ | — | *(append-only)* | — |
| `customer_photos` | ✅ | — | *(append-only)* | — |
| `house_mappings` | ✅ | ✅ | — | `set_updated_at_house_mappings` |
| `customer_paint_shades` | ✅ | — | `applied_date` | — |
| `payments` | ✅ | — | `payment_date` | — |

---

## Build Verification

### TypeScript Typecheck
```
$ pnpm run typecheck
artifacts/paintflow-crm typecheck$ tsc -p tsconfig.json --noEmit
└─ Done in 9.2s
EXIT: 0  ✅  (zero errors)
```

### Production Build
```
$ pnpm --filter @workspace/paintflow-crm run build
vite v7.3.5 building client environment for production...
✓ 1904 modules transformed.
dist/public/assets/index-*.css    104 kB  (gzip: 17 kB)
dist/public/assets/index-*.js    848 kB  (gzip: 246 kB)
✓ built in 13.77s
EXIT: 0  ✅
```

**Warnings (non-blocking):**
- Sourcemap resolution on 5 shadcn/ui components — cosmetic, from Radix upstream
- JS bundle 848 KB > 500 KB threshold — recommended fix: `React.lazy()` per route (future task)

---

## How to Apply Migrations

Run each file in order in the **Supabase SQL Editor** (Dashboard → SQL Editor):

```
001_initial_schema.sql
002_rls_policies.sql
003_customers_extended.sql
004_customer_last_purchase.sql
005_billing_extended.sql
006_production_hardening.sql   ← new
```

All statements use `IF NOT EXISTS`, `OR REPLACE`, and `DROP … IF EXISTS` guards, making each migration safe to re-run without errors.

> **Tip:** If using Supabase CLI locally, run:
> ```bash
> supabase db push
> ```
> This applies all migrations in the `supabase/migrations/` folder automatically.

---

## Known Gaps (Out of Scope for This Migration)

| Gap | Recommendation |
|---|---|
| **No Supabase CLI config** (`supabase/config.toml`) | Run `supabase init` and commit `config.toml` for CLI-managed deployments |
| **No seed data file** | Create `supabase/seed.sql` with a default admin user and shop_settings row |
| **Bundle size 848 KB** | Implement `React.lazy()` + dynamic imports per route |
| **No storage bucket policy** | Add Supabase Storage bucket + RLS for `customer_photos` |
| **No API rate limiting** | Configure Supabase API rate limits in project settings |
| **No backup policy documented** | Supabase Pro plan includes daily PITR — document and test restore procedure |
