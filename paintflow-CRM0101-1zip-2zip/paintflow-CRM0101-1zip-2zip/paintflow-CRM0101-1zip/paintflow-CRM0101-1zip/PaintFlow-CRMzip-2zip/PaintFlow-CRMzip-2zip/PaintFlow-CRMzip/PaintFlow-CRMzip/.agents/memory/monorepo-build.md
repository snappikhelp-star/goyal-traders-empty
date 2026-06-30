---
name: Monorepo & build
description: Project root paths, typecheck/build commands, and key conventions for PaintFlow CRM
---

**Monorepo root**: `/home/runner/workspace/PaintFlow-CRMzip-2zip/PaintFlow-CRMzip-2zip/PaintFlow-CRMzip/PaintFlow-CRMzip/`  
**CRM src**: `artifacts/paintflow-crm/src/`  
**Typecheck**: `pnpm --filter @workspace/paintflow-crm run typecheck`  
**Build**: `pnpm --filter @workspace/paintflow-crm run build`

**Why**: Path is deeply nested from a zip-extracted artifact; easy to forget or mistype.

**Conventions**:
- All Supabase calls in hooks use `as any` cast (generated types lag behind live schema)
- Currency throughout the app is INR — use `en-IN` locale with `currency: "INR"` 
- DO NOT auto-apply migrations to Supabase — user confirms manually in SQL editor
- Migrations are sequential: 001→009; each has a comment block describing its purpose

**Completed migrations**: 001-009. Next = 010.
