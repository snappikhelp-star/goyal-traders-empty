# PaintFlow CRM

A production-ready SaaS CRM for paint shops — manage customers, inventory, billing, and reports from one place.

## Run & Operate

- `pnpm --filter @workspace/paintflow-crm run dev` — run the CRM app (port 25978, preview at `/`)
- `pnpm --filter @workspace/paintflow-crm run typecheck` — typecheck the CRM
- Required env secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React 19 + Vite 7 + Tailwind CSS v4
- React Router v7 (BrowserRouter with BASE_URL basename)
- TanStack Query v5 — all data fetching
- React Hook Form — forms
- Supabase (BaaS) — Auth + PostgreSQL database
- shadcn/ui components (Radix UI primitives)
- Lucide React icons

## Where things live

- `artifacts/paintflow-crm/src/` — all app source
  - `lib/supabase.ts` — typed Supabase client (`createClient<Database>`)
  - `lib/database.types.ts` — source-of-truth TypeScript DB types (manually maintained, mirrors Supabase schema)
  - `lib/connection.ts` — connection verification utility
  - `contexts/AuthContext.tsx` — `AuthProvider` + `AuthContext` export (no hook — hook is separate)
  - `hooks/useAuth.ts` — `useAuth()` hook (separated to satisfy Vite Fast Refresh rules)
  - `types/index.ts` — re-exports all DB row types from `database.types.ts`
  - `pages/` — Login, Dashboard, Customers, Bills, Products, Inventory, Reports, Settings
  - `components/layout/` — AppLayout, Sidebar (collapsible), Header
- `supabase/migrations/` — SQL migration files (run manually in Supabase SQL Editor)
  - `001_initial_schema.sql` — all tables, triggers, sequences
  - `002_rls_policies.sql` — Row Level Security for all tables

## Architecture decisions

- **BaaS pattern**: No Express backend for the CRM — all queries go directly from the React client to Supabase via the typed JS client. This keeps the stack lean and leverages Supabase RLS for security.
- **Vite Fast Refresh rule**: Context files must export only components, hook files export only hooks. `useAuth` lives in `hooks/useAuth.ts`, NOT in `contexts/AuthContext.tsx`.
- **Typed Supabase client**: `createClient<Database>` is used so all `.from()` calls are type-checked. Partial `.select()` results require explicit `as` casts since TypeScript cannot infer narrowed column subsets.
- **RLS enforced at DB level**: Every table has Row Level Security. Authenticated users get read/write access; deletes are restricted to admin/manager roles.
- **Auto-triggers in DB**: Bill numbers auto-generate (`BILL-000001`), inventory rows auto-create when a product is inserted, bill totals auto-recalculate when items change.

## Product

- **Login** — Supabase Auth sign-in with session persistence and auto token refresh
- **Dashboard** — KPI cards (customers, revenue, pending bills, products) + recent bills + low stock alerts
- **Customers** — searchable table with full CRUD actions
- **Bills** — filterable by status, with line items and auto-calculated totals
- **Products** — catalog with SKU, brand, category, price filtering
- **Inventory** — live stock levels with low-stock alerts
- **Reports** — revenue summary, top customers by spend, top products by revenue
- **Settings** — profile, shop info, notifications, security tabs

## User preferences

- Modern/premium UI — no dummy or fake data anywhere
- Do not auto-deploy; always stop and confirm before deploying
- Build features page by page, stop after each major section

## Gotchas

- **Supabase migrations are manual**: Run SQL files in Supabase Dashboard → SQL Editor. There is no Supabase CLI configured.
- **Partial select type inference**: When using `.select("col1, col2")` with the typed client, TypeScript may infer `never`. Cast with `as { col: type }[]`.
- **HMR Fast Refresh**: Do NOT export both components and hooks from the same file. Keep them in separate files.
- **BASE_URL**: BrowserRouter uses `import.meta.env.BASE_URL.replace(/\/$/, "")` as its basename — do not hard-code paths.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
