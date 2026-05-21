# AGENTS.md

## Dev Commands

```bash
npm run dev        # Next.js dev server (localhost:3000)
npm test           # Jest unit tests (src/lib/**/*.test.ts, *.spec.ts)
npm run test:e2e   # Playwright E2E (set E2E_URL env var for local)
npm run lint       # ESLint (next/core-web-vitals + next/typescript)
npm run build      # Production build
```

- Unit tests match `**/src/**/*.test.ts` and `**/src/**/*.spec.ts` (node env, ts-jest).
- E2E tests need `E2E_URL` env or default to `https://project-qtyiz.vercel.app`.
- QA script: `npx ts-node scripts/qa-check.ts` — verifies migrations, endpoints, types.

## Architecture

- **Next.js 14 App Router** (pages: `src/app/`). Path alias `@/` → `src/`.
- **Supabase** (PostgreSQL + Auth + RLS + Storage). Client factories in `src/lib/supabase/`.
- **No `opencode.json`** — works with `.mcp.json` (Supabase and Vercel MCP servers).
- **Deploy**: Vercel (`vercel.json`). Framework: nextjs.
- **Tailwind CSS** with `darkMode: ['class']`, CSS variables for theming.
- **Rate limiting**: Upstash Redis (graceful fallback if not configured).

## TypeScript Quirks

- `next.config.js` has `ignoreBuildErrors: true` because `@supabase/ssr` v0.10.3 has a type inference bug that makes table queries return `never`. Do NOT remove this until upgrading supabase-ssr.
- Workaround: `src/lib/supabase/db.ts` exports a `tables(client)` helper that casts via `as any` to bypass the bug. Always use this helper for server-side DB access instead of raw `supabase.from()`.
- Database types in `src/types/database.types.ts` are **manually maintained**, not auto-generated. If you add/modify tables or columns in SQL, update the types file.

## Supabase Database

### Migration Order (apply in this sequence)

1. `supabase/schema.sql` — core tables + RLS + triggers + indexes
2. `supabase/migration_payments.sql` — MercadoPago columns + `orders_with_credits` view
3. `supabase/migration_success_fee.sql` — `payment_methods`, `success_charges` tables
4. `supabase/migration_multi_company.sql` — `companies` table + `company_id` FKs
5. `supabase/migration_api_integration.sql` — `api_keys`, `api_logs` + `verify_api_key` RPC
6. `supabase/migration_consume_credit_atomic.sql` — replaces `consume_credit` RPC with `company_id` support
7. `supabase/migration_fix_verify_api_key.sql` — fixes hash from bcrypt → SHA-256
8. `supabase/migration_add_file_url.sql` — adds `file_url` column to `analyses`
9. `supabase/migration_rls_and_indexes_FIXED.sql` — redundant RLS+indexes (may produce "already exists" errors safely)
10. `supabase/migrations/20260502_add_performance_indexes.sql` — additional indexes
11. `supabase/migrations/20260520_db_improvements.sql` — **NUEVA**: `company_members`, `success_plans`, UNIQUE+CHECK constraints, índices compuestos, vistas con `security_invoker`

- `scripts/run-migration.js` is **broken** — it tries to POST SQL via REST API which doesn't work. Apply migrations manually in Supabase SQL Editor or use MCP `execute_sql`.
- **Never use `apply_migration`** for iterative changes. Use `execute_sql` (MCP) or `supabase db query` (CLI). Then run advisors and generate a clean migration with `supabase db pull --local`.

### RLS & Security

- All tables have RLS enabled with policies restricting to `auth.uid() = user_id`.
- **Views (`orders_with_credits`, `analyses_with_company`) bypass RLS by default.** They do NOT have `security_invoker = true` set. Protect them or move to private schema.
- RPC functions `consume_credit` and `verify_api_key` use `SECURITY DEFINER` and live in `public` schema — this is insecure per Supabase best practices. Move to a private schema.
- `verify_api_key` uses SHA-256 hashing (not bcrypt). The app's `api-auth.ts` calls this via RPC.

### Known Schema Issues

- ~~`company_members` table: now created by `20260520_db_improvements.sql`~~
- ~~`success_plans` table: now created by `20260520_db_improvements.sql`~~
- ~~`credits.upsert` UNIQUE constraint: now added by `20260520_db_improvements.sql`~~
- ~~`consumeCreditAtomic` RPC call: now passes `p_company_id`~~
- RPC functions `consume_credit` y `verify_api_key` siguen en schema `public` con `SECURITY DEFINER` — mover a schema privado (requiere coordinar con los clientes que las llaman).

### API Key Auth Flow

- SHA-256 hash stored in `api_keys.key_hash`, verified via `verify_api_key` RPC.
- `authenticateApiRequest()` in `src/lib/api-auth.ts` calls the RPC, checks expiration.
- API keys have permissions `['read'] | ['read','write'] | ['admin']`.

## Payment Flow

- **Fixed plans**: `/precios` → `POST /api/payments/create` → MercadoPago → webhook credits credits → `/analisis`
- **Platino (20% success fee)**: `/analisis?plan=platino` → upload → analysis runs without credit → status `awaiting_payment` → user pays 20% → webhook unlocks report
- Webhook endpoint: `POST /api/payments/webhook` — handles both regular payments and `unlock_{analysisId}` events.
- MercadoPago credentials: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`.

## Plan de Mejora de Base de Datos (basado en skills .agents)

### Crítico
1. ~~**Crear tabla `company_members`**~~ ✅ — implementada en `20260520_db_improvements.sql`
2. ~~**Crear tabla `success_plans`**~~ ✅ — implementada en `20260520_db_improvements.sql`
3. ~~**Agregar restricción UNIQUE en `credits(user_id, company_id)`**~~ ✅ — implementada en `20260520_db_improvements.sql`
4. **Mover funciones `SECURITY DEFINER` a schema privado** — `consume_credit` y `verify_api_key` están en `public`, expuestas a la API de datos. Requiere coordinar con los clientes que las llaman.
5. ~~**Agregar `security_invoker = true` a las vistas**~~ ✅ — implementada en `20260520_db_improvements.sql`

### Alto
6. ~~**Agregar índice `idx_credits_user_company`**~~ ✅ — implementado en `20260520_db_improvements.sql`
7. ~~**Agregar índice `idx_anomalies_type_status`**~~ ✅ — implementado en `20260520_db_improvements.sql`
8. ~~**Corregir fallback CAS en `consumeCreditAtomic`**~~ ✅ — ahora pasa `p_company_id`
9. **Consolidar migraciones** — hay 11 archivos SQL con solapamiento (índices duplicados en schema.sql, migration_rls_and_indexes_FIXED.sql, y 20260502_add_performance_indexes.sql).

### Medio
10. ~~**Agregar CHECK en `success_charges.fee_percentage`**~~ ✅ — implementado en `20260520_db_improvements.sql`
11. ~~**Agregar CHECK en `credits.used <= total`**~~ ✅ — implementado en `20260520_db_improvements.sql`
12. **Considerar `supabase db advisors` para detectar más issues de performance.**
