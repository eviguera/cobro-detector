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

### Schema

- **Single consolidated schema**: `supabase/schema.sql` — contiene todas las tablas (12), índices (30+), RLS (11 tablas), políticas (38), funciones SECURITY DEFINER (4), triggers (5), CHECK/UNIQUE constraints (3) y vistas con `security_invoker` (2).
- **Schema `internal`**: schema privado (no expuesto a REST API) para funciones SECURITY DEFINER. Contiene `verify_api_key`, `consume_credit` y `can_access_company`. Wrappers públicos en schema `public` con privilegios mínimos (SECURITY INVOKER o SECURITY DEFINER según necesidad).
- The 10 legacy migration files were consolidated and deleted on 2026-05-21.
- Apply `supabase/schema.sql` in Supabase SQL Editor for fresh installs. For existing databases, it's safe (uses `IF NOT EXISTS` / `CREATE OR REPLACE` / `DO` blocks).
- **Never use `apply_migration`** for iterative changes. Use `execute_sql` (MCP) or `supabase db query` (CLI). Then run advisors and generate a clean migration with `supabase db pull --local`.

### RLS & Security

- All tables have RLS enabled with policies restricting to `auth.uid() = user_id`.
- **Vistas**: `orders_with_credits` y `analyses_with_company` usan `security_invoker = true`.
- **Schema `internal`**: schema privado no expuesto a REST API. Contiene las funciones SECURITY DEFINER (`verify_api_key`, `consume_credit`, `can_access_company`). Wrappers públicos en schema `public` con privilegios mínimos.
- `verify_api_key` uses SHA-256 hashing. The app's `api-auth.ts` calls this via RPC.

### Known Schema Issues

- `handle_new_user` (trigger function) sigue en `public` con SECURITY DEFINER — mover a schema privado.
- `api_logs` table no tiene RLS habilitada — evaluar si es necesaria.

### API Key Auth Flow

- SHA-256 hash stored in `api_keys.key_hash`, verified via `verify_api_key` RPC.
- `authenticateApiRequest()` in `src/lib/api-auth.ts` calls the RPC, checks expiration.
- API keys have permissions `['read'] | ['read','write'] | ['admin']`.

## Payment Flow

- **Fixed plans**: `/precios` → `POST /api/payments/create` → MercadoPago → webhook credits credits → `/analisis`
- **Platino (20% success fee)**: `/analisis?plan=platino` → upload → analysis runs without credit → status `awaiting_payment` → user pays 20% → webhook unlocks report
- Webhook endpoint: `POST /api/payments/webhook` — handles both regular payments and `unlock_{analysisId}` events.
- MercadoPago credentials: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`.

## Plan de Mejora de Base de Datos

### Pendiente
(ninguno por ahora)

### Completado (2026-05-20/21)
- ✅ Tablas `company_members`, `success_plans`
- ✅ UNIQUE `credits(user_id, company_id)`, CHECK `used <= total`, CHECK `fee_percentage`
- ✅ `security_invoker = true` en vistas
- ✅ Índices compuestos (`idx_credits_user_company`, `idx_anomalies_type_status`, etc.)
- ✅ Fallback CAS con `p_company_id`
- ✅ **Migraciones consolidadas** — 11 archivos → 1 (`supabase/schema.sql`)
- ✅ **Funciones SECURITY DEFINER movidas a schema `internal`** — `consume_credit`, `verify_api_key`, `can_access_company` movidas a schema privado no expuesto a REST API. Wrappers públicos: `consume_credit` y `can_access_company` ahora son `SECURITY INVOKER` (usan `auth.uid()`), `verify_api_key` mantiene `SECURITY DEFINER` (necesario para auth sin sesión).
