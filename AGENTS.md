# AGENTS.md

## Comandos de desarrollo

```bash
npm run dev           # Servidor de desarrollo Next.js (localhost:3000)
npm test              # Tests unitarios Jest (src/lib/**/*.test.ts, *.spec.ts)
npm run test:e2e      # Tests E2E Playwright (setear E2E_URL para local)
npm run test:e2e:ui   # Playwright UI mode
npm run lint          # ESLint via next lint (eslint.config.mjs flat config)
npm run build         # Build de producción
```

- Los tests unitarios matchean `**/src/**/*.test.ts` y `**/src/**/*.spec.ts` (node env, ts-jest).
- `jest.setup.ts` mockea `react.cache()` para que la factory de cliente Supabase server funcione en tests.
- Los tests E2E necesitan la variable `E2E_URL` o usan `https://project-qtyiz.vercel.app` por defecto.
- Script de QA: `npx ts-node scripts/qa-check.ts` — verifica migraciones, endpoints, tipos.
- ESLint forbids `any` (`@typescript-eslint/no-explicit-any: error`) except in `src/types/**`. Also warns on `console.log` (only `warn`/`error` allowed).
- `.env.example` es la referencia de variables de entorno. Incluye `LOG_LEVEL` (default: `info`).

## Arquitectura

- **Next.js 14 App Router** (páginas: `src/app/`). Alias `@/` → `src/`.
- **Supabase** (PostgreSQL + Auth + RLS + Storage). Factories de cliente en `src/lib/supabase/`:
  - `server.ts` — cliente server cacheado (usa `react.cache()` + `@supabase/ssr`)
  - `client.ts` — cliente browser (`'use client'`)
  - No hay un cliente separado para middleware; `src/middleware.ts` usa `createServerClient` de `@supabase/ssr` directamente.
- **Middleware** (`src/middleware.ts`): protege `/dashboard`, `/analisis`, `/historial`, `/precios` → redirige a `/login` si no hay sesión. Redirige `/login` y `/` → `/dashboard` si está autenticado.
- **Configuración**: `.mcp.json` (servidores MCP de Supabase, Vercel y GitHub). No existe `opencode.json`.
- **Deploy**: Vercel (`vercel.json`). Framework: nextjs.
- **Tailwind CSS** con `darkMode: ['class']`, variables CSS para temas. Fuentes personalizadas: Archivo, Bricolage Grotesque, JetBrains Mono.
- **Rate limiting**: Upstash Redis (fallback graceful si no está configurado).
- **IA**: Groq SDK (`groq-sdk`) con Llama 3.1 8B para detección de anomalías.
- **Parseo de archivos**: CSV, Excel (`xlsx`), y PDF (`pdf-parse`) de estados de cuenta.
- **Límite de subida**: `10mb` vía `next.config.js` `serverActions.bodySizeLimit`.
- **Pipeline de análisis**: Reglas → CSV pre-etiquetado → IA → resultado combinado. Procesamiento asíncrono via `src/lib/analysis-queue.ts`.

## Quirks de TypeScript

- `next.config.js` tiene `ignoreBuildErrors: true` porque `@supabase/ssr` v0.10.3 tiene un bug de inferencia de tipos que hace que las queries de tabla retornen `never`. NO quitar esto hasta actualizar supabase-ssr.
- Workaround: `src/lib/supabase/db.ts` exporta un helper `tables(client)` que castea via `as any` para evitar el bug. Siempre usar este helper para acceso a DB del lado servidor en vez de `supabase.from()` directamente.
- Los tipos de base de datos en `src/types/database.types.ts` se **mantienen manualmente**, no son auto-generados. Si se agregan o modifican tablas/columnas en SQL, actualizar el archivo de tipos.
- ESLint usa `eslint-config-next` (extiende `next/core-web-vitals` + `next/typescript`). Config en `eslint.config.mjs` (flat config).

## Quirks de React / Next.js

- **NO usar factory pattern para crear componentes** (ej: `createVariantComponent()`). Causa React error #419 en producción — referencias de componente inestables entre server/client render. Usar un solo componente con prop `variant` en vez de `BuyButton.Default`, `BuyButton.Highlighted`, etc.
- **Nunca usar `user!.id` sin null check** en server components. Si `supabase.auth.getUser()` retorna `null` (cookie expirada, sesión inválida), el `!` rompe con error 500 y digest de Next.js. Siempre: `if (!user) redirect('/login')`.
- CSP en `next.config.js` requiere `'unsafe-inline'` en `script-src` para que Next.js funcione correctamente en producción. Sin esto, los scripts inline de hidratación son bloqueados y el login/login rompe silenciosamente.

## Base de Datos Supabase

### Schema

- **Schema único consolidado**: `supabase/schema.sql` — 12 tablas, 30+ índices, RLS (11 tablas), 38 políticas, 4 funciones SECURITY DEFINER, 5 triggers, 3 constraints CHECK/UNIQUE, 2 vistas con `security_invoker`.
- **Schema `internal`**: schema privado (no expuesto a REST API) para funciones SECURITY DEFINER (`verify_api_key`, `consume_credit`, `can_access_company`). Wrappers públicos en `public` con privilegios mínimos.
- Aplicar `supabase/schema.sql` en SQL Editor de Supabase para instalaciones nuevas. Para bases existentes es seguro (usa `IF NOT EXISTS` / `CREATE OR REPLACE` / bloques `DO`).
- **Nunca usar `apply_migration`** para cambios iterativos. Usar `execute_sql` (MCP) o `supabase db query` (CLI). Luego correr advisors y generar una migración limpia con `supabase db pull --local`.

### RLS y Seguridad

- Todas las tablas tienen RLS habilitado con políticas que restringen a `auth.uid() = user_id`.
- Vistas: `orders_with_credits` y `analyses_with_company` usan `security_invoker = true`.
- `verify_api_key` usa hashing SHA-256. `api-auth.ts` de la app llama a esto via RPC.

### Problemas Conocidos del Schema

- **Resuelto**: `handle_new_user` movido a `internal` y revocado de PUBLIC. `orders_with_credits` corregido a SECURITY INVOKER.
- **Resuelto**: `search_path` fijo en todas las funciones (10 funciones con `SET search_path = 'public'` o `SET search_path = ''`).
- **Resuelto**: Políticas RLS duplicadas eliminadas (~80 → 38 políticas limpias).
- **Resuelto**: `orders_status_idx` duplicado eliminado. 3 covering indexes agregados para FKs sin índice.

### Flujo de Auth con API Keys

- Hash SHA-256 almacenado en `api_keys.key_hash`, verificado via RPC `verify_api_key`.
- `authenticateApiRequest()` en `src/lib/api-auth.ts` llama al RPC y verifica expiración.
- Las API keys tienen permisos `['read'] | ['read','write'] | ['admin']`.

## Flujo de Pagos

- **Planes fijos**: `/precios` → `POST /api/payments/create` → MercadoPago → webhook acredita créditos → `/analisis`
- **Platino (20% de lo recuperado)**: `/analisis?plan=platino` → subida → análisis corre sin crédito → status `awaiting_payment` → usuario paga 20% → webhook libera reporte
- Webhook endpoint: `POST /api/payments/webhook` — maneja tanto pagos regulares como eventos `unlock_{analysisId}`.
- Credenciales MercadoPago: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`.

## Seguridad

- **Autenticación en rutas API**: cada handler es responsable de su propia auth. El middleware solo protege rutas de página.
  - `/api/v1/**` usa API keys (Bearer token + RPC `verify_api_key` SHA-256).
  - Resto de `/api/**` usa sesión Supabase (`supabase.auth.getUser()`).
  - Webhook MercadoPago usa HMAC-SHA256 (`x-signature` header).
- **Rate limiting**: `checkStrictRateLimit(ip)` (3 req/60s) para `/api/analyze` y `/api/health`. `checkAuthRateLimit(ip)` (5 req/60s) para auth. Las IPs son sanitizadas via `sanitizeIp()` antes de usarse como key de Redis.
- **Validación de archivos**: el parser (`parser.ts`) rechaza buffers >10MB. `analyzeFile()` solo acepta URLs que estén dentro del bucket `analysis-files` de Supabase Storage (no acepta paths locales ni URLs arbitrarias).
- **Sanitización**: `security.ts` exporta `sanitizeDescription()` (anti prompt-injection para LLM), `sanitizeBankName()` (alfanumérico + español, 50 chars), y `escapeXml()` (para documentos DOCX/PDF).
- **Zod errors**: `api-error.ts` expone solo el primer issue como string genérico, no el array completo de errores Zod.
- **Logging**: `console.error` solo loguea `.message` del Error, no el objeto completo (evita leak de stack traces).
