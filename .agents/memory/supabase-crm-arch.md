---
name: Supabase-only CRM architecture
description: Auth, API, and permission patterns for PaintFlow CRM. Covers the GRANT root-cause bug and how to fix it.
---

## Architecture
- Frontend: `artifacts/paintflow-crm/` (React + Vite + TanStack Query)
- ALL DB queries go directly from the React client to Supabase (no Express intermediary)
- `artifacts/api-server` is a separate product — CRM hooks must never use it

## Auth
- `flowType: "implicit"`, `detectSessionInUrl: false` (PKCE caused redirect failures on the Replit dev domain)
- New Supabase project: `idsofgobnyusnwaojlam.supabase.co`
- Env vars set in `.replit [userenv.shared]`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Critical: GRANTs are required for every table

**Why:** Tables created via SQL migrations (not the Supabase dashboard) do NOT automatically get `GRANT SELECT/INSERT/UPDATE/DELETE` for the `authenticated` and `anon` PostgreSQL roles. PostgREST uses these roles for all client requests. Without explicit GRANTs, every query fails with "permission denied for table X" even though RLS policies are in place. RLS policies only control *which rows* are visible — table-level GRANTs control *whether the role can access the table at all*.

**How to apply:** Migration `013_fix_grants_and_rls.sql` adds all missing GRANTs, ensures RLS is enabled on all 18 tables, recreates all policies idempotently, and self-heals missing profile rows.

**Pattern for future tables:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<new_table> TO authenticated;
ALTER TABLE public.<new_table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<new_table>: all" ON public.<new_table> FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Profile rows / admin role
- `handle_new_user` trigger creates a `profiles` row on `auth.users` INSERT
- Dashboard-created users may bypass this trigger → no profile row → role-gated policies fail silently
- Migration 013 self-heals with `INSERT INTO profiles … SELECT FROM auth.users WHERE id NOT IN profiles`
- Promotes the single existing user to `admin` so shop settings and delete policies work immediately

## shop_settings write policy
- Was restricted to `role = 'admin'` — blocked new installs where no profile exists yet
- Migration 013 opens it to all `authenticated` users (single-shop CRM, no multi-tenant risk)

## Frontend queries
- No `company_id` / `shop_id` filters in the customer or product hooks — not the cause of missing data
- `useShopProfile` silently returns defaults on error (never throws) — safe
