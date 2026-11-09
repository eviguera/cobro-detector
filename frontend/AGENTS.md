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
- **Tests E2E**: `TEST_EMAIL` y `TEST_PASSWORD` configurados en `.env.local` (usuario `test-e2e@cobrodetector.com`, 10 créditos). Ejecutar con `TEST_EMAIL=... TEST_PASSWORD=... npm run test:e2e` o exportar las variables antes.
- Script de QA: `npx ts-node scripts/qa-check.ts` — verifica migraciones, endpoints, tipos.
- ESLint forbids `any` (`@typescript-eslint/no-explicit-any: error`) except in `src/types/**`. Also warns on `console.log` (only `warn`/`error` allowed).
- `.env.example` es la referencia de variables de entorno. Incluye `LOG_LEVEL` (default: `info`).

## Ramas y worktrees

- **main**: rama de producción. El directorio principal del workspace.
- **test-k**: rama de pruebas con rediseño de UI (landing + dashboard unificados). Worktree en `../cobro-detector-test-k`.
- Para trabajar en ambas ramas simultáneamente, usar el directorio correspondiente a cada worktree.

## Arquitectura

- **Frontend Next.js + Backend microservicios** (separación total). Frontend en `frontend/`, microservicios en `analysis-svc/`, `payment-svc/`, `auth-api/`, `admin-svc/`, `notification-svc/`.
- **Hexagonal architecture** en frontend:
  - `src/domain/` — entidades de negocio (Analysis, Profile, Payment, etc.) sin dependencias externas.
  - `src/application/` — casos de uso orquestan la lógica (submitAnalysis, createPaymentPreference).
  - `src/infrastructure/http/` — HTTP clients por microservicio (analysis-api, payment-api, auth-api, admin-api). Un solo `client.ts` base con configuración de URLs via env vars.
  - `src/infrastructure/adapters/` — adapters a servicios externos (supabase-storage para upload de archivos).
  - `src/ui/` (alias `src/app/`, `src/components/`) — componentes React, páginas, layouts.
- **Supabase** directo solo para file upload (Storage) y creación de registros de análisis. Toda otra lógica va por HTTP a microservicios.
- **Next.js 14 App Router** (páginas: `src/app/`). Alias `@/` → `src/`. Route groups: `(auth)` y `(dashboard)`.
- **Supabase Auth** gestionada via `@supabase/ssr`:
  - `src/lib/supabase/server.ts` — cliente server cacheado
  - `src/lib/supabase/client.ts` — cliente browser
  - `src/lib/supabase/db.ts` — helper `tables(client)` (workaround bug `@supabase/ssr`)
  - No hay cliente separado para middleware; `src/middleware.ts` usa `createServerClient` directamente.
- **Middleware** (`src/middleware.ts`): solo protege rutas de página (`/dashboard`, `/analisis`, `/historial`, `/precios`). Sin API routes.
- **Configuración**: `opencode.json` con plugin `superpowers` + `.mcp.json`.
- **Deploy**: Vercel proyecto `cobro-detector` con **Root Directory = `frontend`**, framework `nextjs`, build `npm run build`, output `.next`. El `vercel.json` de la raíz debe reflejar lo mismo; si el proyecto vuelve a root `.`, el build falla en 0 ms porque el `package.json` raíz no tiene build.
- **Tailwind CSS** con `darkMode: ['class']`, variables CSS para temas. Fuentes: **Instrument Serif** (display/editorial), **Archivo** (body), **JetBrains Mono** (datos).
- **Design system v2 ("expediente editorial")**: papel cálido, tinta profunda, serif de alto contraste y cifras mono. Tokens semánticos en `src/app/globals.css` (`--background`, `--card`, `--border`, `--success-*`, `--warning-*`, `--danger-*`). Regla de PR: **no usar `text-gray-300/400/500` para texto**; usar `text-muted-foreground`, `text-foreground`, `text-success-*`, etc. Objetivo: 0 violaciones `color-contrast` en axe (WCAG 2.2 AA).
- **Librerías open-source integradas** (todas >10k estrellas en GitHub): `recharts` (gráficos), `@radix-ui/react-tabs` + `@radix-ui/react-tooltip` + `@radix-ui/react-dialog` (interacción accesible), `cmdk` (command palette ⌘K). `lucide-react`, `sonner`, `next-themes`, `tailwind-merge` ya estaban.
- **Componentes de análisis**: `src/lib/analysis-insights.ts` normaliza hallazgos (camelCase/snake_case), calcula confianza, prioridad, grupos y plan de acción. UI en `src/components/analysis/` (`findings-explorer`, `priority-gauge`, `recovery-plan`, `type-breakdown`, `transactions-table`). No duplicar esta lógica en páginas.
- **IA**: Groq SDK (`groq-sdk`) con Llama 3.1 8B para detección de anomalías (del lado del microservicio analysis-svc). **La IA es una capa opcional**: si falla, el pipeline sigue con reglas determinísticas y resumen local (`buildDeterministicSummary`). No volver a hacer que un fallo de IA tumbe el análisis.
- **Benchmark**: `analysis-svc/benchmarks/` + `npm run benchmark` (precision/recall/F1 por caso; `--strict` falla bajo 90%).
- **Motor de reglas**: `analysis-svc/src/domain/anomaly-rules.ts`. Reglas de precisión: comisión de crédito repetida, cobro duplicado (mismo comercio + monto, ventana ≤10 días), intereses en cuotas sin interés, cargos genéricos y etiquetas del CSV. Cada hallazgo incluye `confidence` (0–100), `evidence` y `recommendedAction`. `mergeAnomalies` evita doble conteo: una transacción recuperable se reclama una sola vez.
- **Parseo de archivos**: CSV, Excel (`exceljs`), y PDF (`pdf-parse`) de estados de cuenta (del lado de analysis-svc).
- **Límite de subida**: `10mb` vía `next.config.js` `serverActions.bodySizeLimit`. El bucket `analysis-files` solo acepta `text/csv`, `application/pdf`, `application/vnd.ms-excel` y `.xlsx`; el adapter debe declarar el MIME original aunque el contenido vaya cifrado.
- **Cifrado**: AES-256-GCM en el navegador (Web Crypto). El tag de autenticación viene concatenado al ciphertext; analysis-svc debe separar los últimos 16 bytes y usar `decipher.setAuthTag()`.

## Quirks de TypeScript

- `next.config.js` tiene `ignoreBuildErrors: true` porque `@supabase/ssr` v0.10.3 tiene un bug de inferencia de tipos que hace que las queries de tabla retornen `never`. NO quitar esto hasta actualizar supabase-ssr.
- Workaround: `src/lib/supabase/db.ts` exporta un helper `tables(client)` que castea via `as any` para evitar el bug. Siempre usar este helper para acceso a DB del lado servidor en vez de `supabase.from()` directamente.
- Los tipos de dominio están en `src/domain/index.ts` (NO en `src/types/database.types.ts`). Si se agregan o modifican tipos en los microservicios, actualizar `src/domain/index.ts`.
- ESLint usa `eslint-config-next` (extiende `next/core-web-vitals` + `next/typescript`). Flat config en `eslint.config.mjs`.
- `next lint` puede pedir configuración interactiva en CI — usar `npx next lint` en vez de `npm run lint` para evitarlo.

## Quirks de React / Next.js

- **NO usar factory pattern para crear componentes** (ej: `createVariantComponent()`). Causa React error #419 en producción — referencias de componente inestables entre server/client render. Usar un solo componente con prop `variant` en vez de `BuyButton.Default`, `BuyButton.Highlighted`, etc.
- **Nunca usar `user!.id` sin null check** en server components. Si `supabase.auth.getUser()` retorna `null` (cookie expirada, sesión inválida), el `!` rompe con error 500 y digest de Next.js. Siempre: `if (!user) redirect('/login')`.
- CSP en `next.config.js` requiere `'unsafe-inline'` en `script-src` para que Next.js funcione correctamente en producción. Sin esto, los scripts inline de hidratación son bloqueados y el login/login rompe silenciosamente.

## CI/CD

- **GitHub Actions**: `.github/workflows/opencode.yml` ejecuta OpenCode en issues/PRs con comentarios `/oc` o `/opencode`. Usa `anomalyco/opencode/github@latest`.
- **Logout**: client-side via `supabase.auth.signOut()` (no hay `/api/logout`).

## Base de Datos Supabase

El skill `cobro-detector-db` (`.agents/skills/cobro-detector-db/SKILL.md`) es la referencia completa del schema. Resumen ejecutivo:

- **Schema consolidado**: `supabase/schema.sql` — 15 tablas, 30+ índices, RLS en todas las tablas de usuario, 8 triggers, 3 constraints, 2 vistas `security_invoker`.
- **Feedback, telemetría y reclamo**: `anomaly_feedback` guarda el feedback por hallazgo (falsos positivos); `product_events` guarda eventos del embudo (`analysis_started`, `analysis_completed`, `analysis_failed`, `report_downloaded`, `claim_status_changed`); `claim_tracking` guarda el estado del reclamo (`draft|sent|responded|escalated`). Todas con RLS `auth.uid() = user_id`.
- **Schema `internal`**: privado para funciones SECURITY DEFINER (`verify_api_key`, `consume_credit`, `can_access_company`). Wrappers públicos en `public`.
- Aplicar `supabase/schema.sql` en SQL Editor de Supabase para instalaciones nuevas. Es idempotente (`IF NOT EXISTS` / `CREATE OR REPLACE` / bloques `DO`).
- **Nunca usar `apply_migration`** para cambios iterativos. Usar `execute_sql` (MCP). Luego correr advisors.
- `handle_new_user()` está en schema `public` (SECURITY DEFINER, `SET search_path = 'public'`). Ejecución revocada a `anon`/`authenticated`.
- Todas las tablas RLS usan `auth.uid() = user_id`.
- Flujo API keys: hash SHA-256 en `api_keys.key_hash` → RPC `internal.verify_api_key`. `authenticateApiRequest()` en `src/lib/api-auth.ts`.
- **NO modificar** `public.verify_api_key`: es SECURITY DEFINER ejecutable por `anon` intencionalmente (necesario para validar API keys sin sesión). El advisor de Supabase lo reporta como warning pero es por diseño.

## Flujo de Pagos

- **Planes fijos**: `/precios` → `createPaymentPreference()` (application) → `POST /v1/preferences` (payment-svc) → MercadoPago → webhook acredita créditos → `/analisis`
- **Platino (20% de lo recuperado)**: `/analisis?plan=platino` → subida → análisis corre sin crédito → status `awaiting_payment` → usuario paga 20% → webhook libera reporte
- Webhook endpoint: `POST /v1/webhook` en payment-svc — maneja tanto pagos regulares como eventos `unlock_{analysisId}`.
- Credenciales MercadoPago: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`.

## Seguridad

- **Autenticación**: el frontend usa sesión Supabase (`supabase.auth.getUser()`) para páginas protegidas vía middleware. Los microservicios usan API keys (Bearer token) o JWT de Supabase según el endpoint.
- **No hay API routes en el frontend** — toda la lógica de negocio pasa por microservicios.
- El middleware solo protege rutas de página; no hay autenticación de rutas API en el frontend.
- **Validación de archivos**: el upload se hace directo a Supabase Storage desde el frontend. El análisis lo procesa analysis-svc.

## Plan de mejora pendiente

### Alta prioridad
- Configurar variables de entorno en Vercel para frontend (`NEXT_PUBLIC_ANALYSIS_SVC_URL`, `NEXT_PUBLIC_PAYMENT_SVC_URL`, etc.)
- Configurar webhook MercadoPago → `{PAYMENT_SVC_URL}/v1/webhook`
- Probar flujo de pago end-to-end con tarjeta de prueba
- Deployar microservicios restantes (payment-svc, admin-svc, notification-svc)
- Re-escribir tests E2E para el nuevo flujo (sin API routes)
- ~~Migrar `xlsx` → `exceljs`~~ **Completado (2026-05-25)**
- ~~Corregir ESLint (67 errores: any types, unused vars, console.log)~~ **Completado (2026-05-25)**

### Media prioridad
- ~~Generar CSV de 3.000 transacciones para testing de detección masiva~~ **Completado**
- ~~E2E tests: flujo autenticado (login + upload + análisis)~~ **Completado** (`npm run test:e2e`)
- ~~Procesamiento asíncrono con cola de mensajes (microservicios)~~ **Completado** (Redis + worker)
- Upgrade a Next.js 15
- ~~Deduplicación de anomalías detectadas por múltiples reglas~~ **Completado** (`mergeAnomalies` + anti doble conteo)
- ~~Agregar health checks entre microservicios~~ **Completado** (`GET /health` en analysis-svc)

### Completado en la iteración de producto (2026-11)
- Rediseño visual "ledger" en landing, login, panel, análisis, historial, detalle, precios y métricas.
- Onboarding ya no bloquea el primer pantallazo: se abre desde "Guía rápida" en el sidebar.
- `⌘K` command palette para navegación.
- Detalle v2: monto → prioridad/confianza → hallazgos con evidencia → plan de reclamo → movimientos.
- Motor de análisis con precisión, confianza, evidencia y resumen determinístico.
- Accesibilidad: 0 violaciones axe (WCAG 2.2 AA) en `/`, `/login`, `/dashboard`, `/historial`, `/historial/[id]`, `/analisis`, `/precios`, `/dashboard/analytics`.
- Verificación E2E real con una cartola de prueba: 10 movimientos → 4 hallazgos → $113.500 recuperables.

### Baja prioridad
- Configurar Sentry para monitoreo de errores
- Agregar más casos de prueba E2E (PDF, Excel con distintos bancos)
- Medir precisión del motor con un set etiquetado por banco (precision/recall)
