# PaintFlow CRM — Database Diagram

> Generated: 2026-06-26  
> Database: PostgreSQL 15 (Supabase)  
> Schema: `public`

---

## Entity-Relationship Diagram (Text)

```
auth.users (Supabase-managed)
    │
    │ 1:1 (on signup trigger)
    ▼
┌─────────────────────────────────────────────────────┐
│ profiles                                            │
│─────────────────────────────────────────────────────│
│ PK  id            uuid  → auth.users.id             │
│     email         text  NOT NULL                    │
│     full_name     text                              │
│     avatar_url    text                              │
│     role          text  admin|manager|staff         │
│     created_at    timestamptz DEFAULT now()         │
│     updated_at    timestamptz DEFAULT now() ▲trig   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ shop_settings                                       │
│─────────────────────────────────────────────────────│
│ PK  id            integer  CHECK(id=1) singleton    │
│     shop_name     text     DEFAULT ''               │
│     address       text                              │
│     phone         text                              │
│     email         text                              │
│     tax_number    text                              │
│     tax_rate      numeric(5,2) DEFAULT 0            │
│     currency      text     DEFAULT 'USD'            │
│     logo_url      text                              │
│     created_at    timestamptz DEFAULT now()         │
│     updated_at    timestamptz DEFAULT now() ▲trig   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ customers                                           │
│─────────────────────────────────────────────────────│
│ PK  id                uuid  DEFAULT gen_random_uuid │
│     name              text  NOT NULL                │
│     email             text                          │
│     phone             text  ← IDX (partial)         │
│     alternate_mobile  text  ← IDX (partial)         │
│     address           text                          │
│     city              text  ← IDX                   │
│     state             text  ← IDX                   │
│     pincode           text                          │
│     gst_number        text  ← UNIQUE IDX (partial)  │
│     birthday          date                          │
│     anniversary       date                          │
│     notes             text                          │
│     last_purchase_date date  ← denorm, ▲trig        │
│     created_at        timestamptz DEFAULT now()     │
│     updated_at        timestamptz DEFAULT now() ▲trig│
│                                                     │
│  GIN  customers_name_idx   (to_tsvector name)       │
│  GIN  customers_search_idx (name+phone+mobile+...)  │
│  B-tree customers_name_lower_idx  lower(name)       │
│  B-tree customers_phone_idx       phone             │
│  B-tree customers_alternate_mobile_idx              │
└──────────────┬──────────────────────────────────────┘
               │ 1:N (on delete CASCADE / RESTRICT)
    ┌──────────┴───────────┬───────────────┬──────────────────┐
    │                      │               │                  │
    ▼                      ▼               ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌────────────┐  ┌────────────────┐
│customer_notes │  │customer_photos│  │  payments  │  │ house_mappings │
│───────────────│  │───────────────│  │────────────│  │────────────────│
│PK id  uuid    │  │PK id  uuid    │  │PK id  uuid │  │PK id  uuid     │
│FK customer_id │  │FK customer_id │  │FK customer_│  │FK customer_id  │
│FK created_by  │  │   url  text   │  │   id       │  │   property_name│
│   →profiles   │  │   caption     │  │FK bill_id  │  │   address      │
│   content text│  │FK house_       │  │   →bills   │  │   property_type│
│   created_at  │  │   mapping_id  │  │   amount   │  │   area_sqft    │
└───────────────┘  │   →house_     │  │   method   │  │   rooms        │
                   │   mappings    │  │   date     │  │   notes        │
                   │   created_at  │  │   reference│  │   created_at   │
                   └───────────────┘  │   created_at│  │   updated_at ▲ │
                                      └────────────┘  └──────┬─────────┘
                                                             │ 1:N
                                      ┌──────────────────────┘
                                      ▼
                           ┌──────────────────────────────┐
                           │  customer_paint_shades       │
                           │──────────────────────────────│
                           │PK id           uuid          │
                           │FK customer_id  → customers   │
                           │FK house_mapping_id           │
                           │   → house_mappings (SET NULL)│
                           │   brand        text          │
                           │   shade_name   text NOT NULL │
                           │   shade_code   text  ← IDX   │
                           │   room_area    text          │
                           │   applied_date date          │
                           │   notes        text          │
                           │   created_at   timestamptz   │
                           └──────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ products                                                 │
│──────────────────────────────────────────────────────────│
│ PK  id            uuid  DEFAULT gen_random_uuid          │
│     name          text  NOT NULL                         │
│     sku           text  NOT NULL  UNIQUE ← IDX           │
│     brand         text                                   │
│     color         text                                   │
│     category      text  NOT NULL  ← IDX                  │
│     price         numeric(12,2)   CHECK >= 0             │
│     unit          text  DEFAULT 'liter'                  │
│     description   text                                   │
│     barcode       text  UNIQUE IDX (partial, not null)   │
│     shade_number  text  IDX (partial, not null)          │
│     pack_size     text                                   │
│     hsn_code      text                                   │
│     created_at    timestamptz DEFAULT now()              │
│     updated_at    timestamptz DEFAULT now() ▲trig        │
│                                                          │
│  B-tree  products_name_lower_idx  lower(name)            │
│  B-tree  products_sku_idx         sku                    │
│  B-tree  products_category_idx    category               │
│  Partial products_barcode_idx     barcode  (not null)    │
│  Partial products_shade_number_idx shade_number (not null)│
└──────────────────┬───────────────────────────────────────┘
                   │ 1:1 (auto-created on product insert)
                   ▼
        ┌──────────────────────────────────┐
        │ inventory                        │
        │──────────────────────────────────│
        │ PK id           uuid             │
        │ FK product_id   → products       │
        │    UNIQUE (one row per product)  │
        │    quantity     numeric(12,3)    │
        │    min_quantity numeric(12,3)    │
        │    location     text             │
        │    last_updated timestamptz ▲trig│
        └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ bills                                                    │
│──────────────────────────────────────────────────────────│
│ PK  id             uuid   DEFAULT gen_random_uuid        │
│ FK  customer_id    → customers  ON DELETE RESTRICT       │
│     bill_number    text   NOT NULL  UNIQUE ← auto-gen    │
│     date           date   DEFAULT current_date           │
│     due_date       date                                  │
│     status         text   draft|sent|paid|overdue|cancel │
│     subtotal       numeric(12,2)  ← auto-calc ▲trig      │
│     discount       numeric(12,2)  ← auto-calc ▲trig      │
│     tax_rate       numeric(5,2)                          │
│     tax            numeric(12,2)  ← auto-calc ▲trig      │
│     total          numeric(12,2)  ← auto-calc ▲trig      │
│     paid_amount    numeric(12,2)                         │
│     payment_method text   cash|upi|card|credit|...       │
│     notes          text                                  │
│     created_at     timestamptz DEFAULT now()             │
│     updated_at     timestamptz DEFAULT now() ▲trig       │
│                                                          │
│  B-tree  bills_customer_id_idx  customer_id              │
│  B-tree  bills_status_idx       status                   │
│  B-tree  bills_date_idx         date DESC                │
│  UNIQUE  (bill_number)                                   │
└──────────────────┬───────────────────────────────────────┘
                   │ 1:N (on delete CASCADE)
                   ▼
        ┌──────────────────────────────────────────────────┐
        │ bill_items                                       │
        │──────────────────────────────────────────────────│
        │ PK  id            uuid  DEFAULT gen_random_uuid  │
        │ FK  bill_id       → bills       ON DELETE CASCADE│
        │ FK  product_id    → products    ON DELETE RESTRICT│
        │     product_name  text  (snapshot at sale time)  │
        │     brand         text  (snapshot)               │
        │     shade_number  text  (snapshot)               │
        │     pack_size     text  (snapshot)               │
        │     quantity      numeric(12,3)  CHECK > 0       │
        │     unit_price    numeric(12,2)  CHECK >= 0      │
        │     discount      numeric(12,2)  DEFAULT 0       │
        │     gst_rate      numeric(5,2)   DEFAULT 0       │
        │     gst_amount    numeric(12,2)  DEFAULT 0       │
        │     total         numeric(12,2)  DEFAULT 0       │
        │                                                  │
        │  B-tree  bill_items_bill_id_idx  bill_id         │
        └──────────────────────────────────────────────────┘
```

---

## Relationships Summary

| From Table | Column | To Table | Column | On Delete |
|---|---|---|---|---|
| `profiles` | `id` | `auth.users` | `id` | CASCADE |
| `customers` | _(none)_ | _(root entity)_ | — | — |
| `customer_notes` | `customer_id` | `customers` | `id` | CASCADE |
| `customer_notes` | `created_by` | `auth.users` | `id` | SET NULL |
| `customer_photos` | `customer_id` | `customers` | `id` | CASCADE |
| `customer_photos` | `house_mapping_id` | `house_mappings` | `id` | SET NULL |
| `house_mappings` | `customer_id` | `customers` | `id` | CASCADE |
| `customer_paint_shades` | `customer_id` | `customers` | `id` | CASCADE |
| `customer_paint_shades` | `house_mapping_id` | `house_mappings` | `id` | SET NULL |
| `payments` | `customer_id` | `customers` | `id` | CASCADE |
| `payments` | `bill_id` | `bills` | `id` | SET NULL |
| `bills` | `customer_id` | `customers` | `id` | RESTRICT |
| `bill_items` | `bill_id` | `bills` | `id` | CASCADE |
| `bill_items` | `product_id` | `products` | `id` | RESTRICT |
| `inventory` | `product_id` | `products` | `id` | CASCADE (UNIQUE) |

---

## Index Inventory

| Table | Index Name | Columns | Type | Notes |
|---|---|---|---|---|
| `customers` | `customers_name_idx` | `to_tsvector(name)` | GIN | Full-text search |
| `customers` | `customers_search_idx` | `to_tsvector(name+phone+...)` | GIN | Multi-field FTS |
| `customers` | `customers_name_lower_idx` | `lower(name)` | B-tree | ILIKE prefix |
| `customers` | `customers_phone_idx` | `phone` | B-tree | Partial (not null) |
| `customers` | `customers_alternate_mobile_idx` | `alternate_mobile` | B-tree | Partial (not null) |
| `customers` | `customers_city_idx` | `city` | B-tree | City filter |
| `customers` | `customers_state_idx` | `state` | B-tree | State filter |
| `customers` | `customers_gst_number_idx` | `gst_number` | UNIQUE B-tree | Partial (not null/empty) |
| `products` | `products_sku_idx` | `sku` | B-tree | Also UNIQUE constraint |
| `products` | `products_category_idx` | `category` | B-tree | Category filter |
| `products` | `products_name_lower_idx` | `lower(name)` | B-tree | ILIKE prefix |
| `products` | `products_barcode_idx` | `barcode` | UNIQUE B-tree | Partial (not null) |
| `products` | `products_shade_number_idx` | `shade_number` | B-tree | Partial (not null) |
| `bills` | _(PK)_ | `id` | B-tree | Primary key |
| `bills` | _(UNIQUE)_ | `bill_number` | B-tree | Auto-generated sequence |
| `bills` | `bills_customer_id_idx` | `customer_id` | B-tree | Customer bills list |
| `bills` | `bills_status_idx` | `status` | B-tree | Status filter |
| `bills` | `bills_date_idx` | `date DESC` | B-tree | Date sort |
| `bill_items` | `bill_items_bill_id_idx` | `bill_id` | B-tree | Line items for bill |
| `inventory` | _(UNIQUE)_ | `product_id` | B-tree | One row per product |
| `customer_notes` | `customer_notes_customer_idx` | `customer_id` | B-tree | Notes per customer |
| `customer_photos` | `customer_photos_customer_idx` | `customer_id` | B-tree | Photos per customer |
| `house_mappings` | `house_mappings_customer_idx` | `customer_id` | B-tree | Properties per customer |
| `customer_paint_shades` | `customer_paint_shades_customer_idx` | `customer_id` | B-tree | Shades per customer |
| `customer_paint_shades` | `customer_paint_shades_shade_code_idx` | `shade_code` | B-tree | Partial (not null) |
| `payments` | `payments_customer_idx` | `customer_id` | B-tree | Payments per customer |
| `payments` | `payments_bill_idx` | `bill_id` | B-tree | Payments per bill |
| `payments` | `payments_date_idx` | `payment_date DESC` | B-tree | Date sort |
| `payments` | `payments_date_created_idx` | `created_at DESC` | B-tree | Created-at sort |

---

## RLS Policy Matrix

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|:---:|:---:|:---:|:---:|
| `profiles` | own user | ✅ | — | ✅ | — |
| `profiles` | admin | ✅ | — | — | — |
| `shop_settings` | any auth | ✅ | — | — | — |
| `shop_settings` | admin | ✅ | ✅ | ✅ | ✅ |
| `customers` | any auth | ✅ | ✅ | ✅ | — |
| `customers` | admin/manager | ✅ | ✅ | ✅ | ✅ |
| `products` | any auth | ✅ | ✅ | ✅ | — |
| `products` | admin/manager | ✅ | ✅ | ✅ | ✅ |
| `inventory` | any auth | ✅ | ✅ | ✅ | ✅ |
| `bills` | any auth | ✅ | ✅ | ✅ | — |
| `bills` | admin/manager | ✅ | ✅ | ✅ | ✅ |
| `bill_items` | any auth | ✅ | ✅ | ✅ | ✅ |
| `customer_notes` | any auth | ✅ | ✅ | ✅ | ✅ |
| `customer_photos` | any auth | ✅ | ✅ | ✅ | ✅ |
| `house_mappings` | any auth | ✅ | ✅ | ✅ | ✅ |
| `customer_paint_shades` | any auth | ✅ | ✅ | ✅ | ✅ |
| `payments` | any auth | ✅ | ✅ | ✅ | ✅ |

---

## Trigger Inventory

| Trigger Name | Table | Event | Function | Purpose |
|---|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` | Auto-create profile on signup |
| `on_product_created` | `products` | AFTER INSERT | `handle_new_product()` | Auto-create inventory row |
| `set_bill_number` | `bills` | BEFORE INSERT | `generate_bill_number()` | Auto-generate `BILL-000001` |
| `recalculate_on_item_change` | `bill_items` | AFTER INSERT/UPDATE/DELETE | `recalculate_bill_totals()` | Keep bill subtotal/tax/total in sync |
| `sync_last_purchase_on_bill` | `bills` | AFTER INSERT/UPDATE/DELETE | `sync_customer_last_purchase()` | Keep `customers.last_purchase_date` in sync |
| `set_updated_at_profiles` | `profiles` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_updated_at_customers` | `customers` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_updated_at_products` | `products` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_updated_at_bills` | `bills` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_updated_at_house_mappings` | `house_mappings` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_updated_at_shop_settings` | `shop_settings` | BEFORE UPDATE | `set_updated_at()` | Auto-stamp `updated_at` |
| `set_last_updated_inventory` | `inventory` | BEFORE UPDATE | `set_inventory_last_updated()` | Auto-stamp `last_updated` |

---

## Sequences

| Sequence Name | Used By | Format |
|---|---|---|
| `bill_number_seq` | `generate_bill_number()` on `bills` | `BILL-000001` … `BILL-999999` |
