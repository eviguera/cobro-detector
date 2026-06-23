# CobroDetector — Skill Maestro

Skill hub del proyecto. Proporciona el mapa completo de documentación y referencias rápidas. Para detalles, consultar los documentos específicos o el skill `cobro-detector-db`.

---

## TLDR del Proyecto

CobroDetector es una plataforma SaaS chilena que detecta cobros injustificados en estados de cuenta bancarios mediante IA. **3 pasos**: subir estado de cuenta → análisis automático → carta de reclamo lista para el banco.

| Dato | Valor |
|------|-------|
| **Stack** | Next.js 14 + Supabase + Groq (Llama 3.1 8B) + MercadoPago + Upstash Redis |
| **Base de datos** | PostgreSQL, 12 tablas, 38 políticas RLS, 8 triggers, schema `internal` privado |
| **Planes** | Inicial ($20K/1), Plus ($30K/2), Contador ($100K/10), Platino (20% de lo recuperado) |
| **Bancos** | Santander, BCI, Chile, Estado, Itaú, Scotiabank, Security, Falabella, Ripley |
| **Formatos** | CSV, Excel (exceljs), PDF (pdf-parse) — máx 10MB |
| **Testing** | 15 tests unitarios Jest + 10 tests E2E Playwright |
| **Deploy** | Vercel (producción: `project-qtyiz.vercel.app`, dominio: `cobrodetector.cl`) |

---

## Documentación del Proyecto

Toda la documentación completa está en `docs/superpowers/specs/`:

| # | Documento | Archivo | Usar cuando... |
|---|-----------|---------|----------------|
| 1 | **PRD** — Requisitos de Producto | `docs/superpowers/specs/2026-05-26-prd.md` | Entender el negocio, usuarios, funcionalidades, planes |
| 2 | **TRD** — Requisitos Técnicos | `docs/superpowers/specs/2026-05-26-trd.md` | Conocer stack, arquitectura, decisiones técnicas, seguridad |
| 3 | **UI/UX** — Diseño de Interfaz | `docs/superpowers/specs/2026-05-26-ui-ux.md` | Diseñar/entender páginas, componentes, tema, responsive |
| 4 | **Flujos** — Diagramas de Secuencia | `docs/superpowers/specs/2026-05-26-flujos.md` | Entender flujos: registro, login, análisis, pago, reporte |
| 5 | **Backend Schema** — DB y API | `docs/superpowers/specs/2026-05-26-backend-schema.md` | Schema completo, API endpoints, pipeline de análisis |
| 6 | **Plan** — Implementación | `docs/superpowers/specs/2026-05-26-plan-implementacion.md` | Ver roadmap, fases, riesgos, estado del proyecto |

### Skills coordinados

| Skill | Cuándo cargarlo |
|-------|-----------------|
| **cobro-detector-db** | Cambios de schema SQL, RLS, funciones, triggers, migraciones. Es la referencia autoritativa del schema. |
| **cobro-detector** (este) | Visión general del proyecto, navegación de docs, quick reference. |
| **supabase** | Auth, RLS, Storage, Edge Functions, buenas prácticas Supabase |
| **next-best-practices** | Server Components, route handlers, data fetching, metadata |

---

## Quick Reference: ¿Qué archivo tocar?

### Si necesitas modificar...

| Tarea | Archivo(s) principales |
|-------|----------------------|
| **Parser de archivos** | `src/lib/parser.ts` |
| **Motor de detección (reglas + IA)** | `src/lib/analyzer.ts` |
| **Pipeline de análisis completo** | `src/lib/services/analysis.service.ts` |
| **Créditos (consumo, creación)** | `src/lib/services/credit.service.ts` |
| **Multi-empresa (CRUD)** | `src/lib/services/company.service.ts` |
| **Planes y precios** | `src/lib/plans.ts` |
| **Constantes (bancos, tipos, estados)** | `src/lib/constants.ts` |
| **Formateo CLP/fechas** | `src/lib/utils.ts` |
| **MercadoPago (crear preferencia)** | `src/lib/mercadopago.ts` |
| **Autenticación API keys** | `src/lib/api-auth.ts` |
| **Rate limiting** | `src/lib/rate-limit.ts` |
| **Sanitización / seguridad** | `src/lib/security.ts` |
| **Generación DOCX/PDF** | `src/lib/document-generator.ts` |
| **Cola de análisis asíncrono** | `src/lib/analysis-queue.ts` |

### Si necesitas modificar una página/ruta...

| Ruta | Archivo(s) | Tipo |
|------|-----------|------|
| `/` Landing | `src/app/page.tsx` | Server |
| `/login` | `src/app/(auth)/login/page.tsx` | Client |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` + `dashboard-client.tsx` | Server + Client |
| `/analisis` | `src/app/(dashboard)/analisis/page.tsx` | Client |
| `/historial` | `src/app/(dashboard)/historial/page.tsx` | Server |
| `/historial/[id]` | `src/app/(dashboard)/historial/[id]/page.tsx` | Server |
| `/precios` | `src/app/(dashboard)/precios/page.tsx` | Server |

### Si necesitas modificar un API endpoint...

| Endpoint | Archivo | Auth |
|----------|---------|------|
| `POST /api/analyze` | `src/app/api/analyze/route.ts` | Sesión |
| `DELETE /api/analyses/[id]` | `src/app/api/analyses/[id]/route.ts` | Sesión |
| `POST /api/payments/create` | `src/app/api/payments/create/route.ts` | Sesión |
| `POST /api/payments/webhook` | `src/app/api/payments/webhook/route.ts` | HMAC |
| `POST /api/payments/unlock-report` | `src/app/api/payments/unlock-report/route.ts` | Sesión |
| `CRUD /api/companies` | `src/app/api/companies/route.ts` + `[id]/route.ts` | Sesión |
| `POST /api/documents/complaint-letter` | `src/app/api/documents/complaint-letter/route.ts` | Sesión |
| `POST /api/documents/complaint-letter/pdf` | `src/app/api/documents/complaint-letter/pdf/route.ts` | Sesión |
| `POST /api/logout` | `src/app/api/logout/route.ts` | Sesión |
| `GET /api/health` | `src/app/api/health/route.ts` | Ninguna |
| `GET /api/v1/analyses/[id]` | `src/app/api/v1/analyses/[id]/route.ts` | API Key |

---

## Arquitectura Express

```
Cliente (Navegador)
    │
    ▼
Vercel (Next.js 14 App Router)
    │
    ├── Middleware (src/middleware.ts)
    │   Protege /dashboard, /analisis, /historial, /precios
    │   Redirige / y /login → /dashboard si autenticado
    │
    ├── Server Components (RSC) — Dashboard, Historial, Precios
    ├── Client Components — Análisis (upload), Login, Toggles
    └── API Routes — /api/analyze, /api/payments/*, /api/v1/*
            │
            ├── Supabase (PostgreSQL + Auth + Storage)
            │   └── RLS en 12 tablas (auth.uid() = user_id)
            │
            ├── Groq API (Llama 3.1 8B Instant, JSON mode)
            │   └── Detección IA de anomalías (timeout 30s)
            │
            ├── MercadoPago (SDK 2.0.15)
            │   └── Pagos + Webhooks (HMAC-SHA256)
            │
            └── Upstash Redis
                └── Rate limiting (graceful fallback)
```

---

## Pipeline de Análisis

```
Archivo (CSV/Excel/PDF)
  → Parser (src/lib/parser.ts)
    → detectBank() — identifica banco por keywords
    → 3 capas en paralelo (Promise.all):
       1. detectAnomaliesRules() — 4 reglas determinísticas
       2. detectLabeledAnomalies() — anomalías pre-etiquetadas CSV
       3. analyzeTransactionsWithAI() — Groq Llama 3.1 8B
  → Combinar resultados
  → Guardar en DB (analyses + anomalies)
  → Retornar al frontend
```

---

## Tipos de Anomalías

| Type | Severidad | Origen |
|------|-----------|--------|
| `duplicate_commission` | high | Comisión crédito duplicada — Reglas + CSV + IA |
| `incorrect_charge` | medium | Cobro incorrecto — CSV (`COBRO_INCORRECTO`) |
| `installment_error` | high | Error en cuotas sin interés — IA |
| `unknown_charge` | low | Cargo no reconocido — Reglas + IA |

---

## Modelo de Datos (Resumen)

12 tablas en schema `public` + funciones SECURITY DEFINER en schema `internal`:

```
auth.users → profiles (1:1, trigger handle_new_user)
profiles → credits, analyses, orders, api_keys, payment_methods
profiles → companies (como accountant) → company_members
analyses → anomalies → success_charges
```

Para detalle completo de columnas, índices, RLS, funciones y triggers → cargar skill `cobro-detector-db` o leer `docs/superpowers/specs/2026-05-26-backend-schema.md`.

---

## Convenciones del Proyecto

Ver `AGENTS.md` para detalle completo. Resumen:

- **TypeScript**: ESLint forbids `any` excepto en `src/types/**`. Tipos DB en `database.types.ts` mantenidos manualmente.
- **Supabase**: Usar helper `tables(client)` de `src/lib/supabase/db.ts` (workaround bug `@supabase/ssr`). `ignoreBuildErrors: true` en `next.config.js`.
- **Componentes**: NO usar factory pattern. Un solo componente con prop `variant`.
- **Auth**: Siempre null-check `user` antes de usar `user.id`. `if (!user) redirect('/login')`.
- **CSP**: `'unsafe-inline'` en `script-src` requerido para Next.js.
- **API**: Cada handler es responsable de su propia auth. Middleware solo protege páginas.
- **Logout**: Validar origin/referer/host contra whitelist (localhost, cobrodetector.cl, *.vercel.app).
- **Schema SQL**: Actualizar `supabase/schema.sql` y `src/types/database.types.ts` con cada cambio DDL.
- **Commits**: Convencionales (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **Ramas**: `feature/<nombre>` desde `main`.
- **Logging**: `console.error` solo con `.message`, no el objeto completo.

---

## Variables de Entorno

```
NEXT_PUBLIC_SUPABASE_URL=         # URL proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key
SUPABASE_SERVICE_ROLE_KEY=        # Service role (server-only)
GROQ_API_KEY=                     # Groq API key
NEXT_PUBLIC_APP_URL=              # URL app (ej: https://cobrodetector.cl)
MERCADOPAGO_ACCESS_TOKEN=         # MP access token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY= # MP public key
MERCADOPAGO_WEBHOOK_SECRET=       # MP webhook HMAC secret
UPSTASH_REDIS_URL=                # Redis URL (opcional, graceful fallback)
UPSTASH_REDIS_TOKEN=              # Redis token (opcional)
LOG_LEVEL=                        # info (default)
```

---

## Roadmap Express

| Fase | Estado | Contenido |
|------|--------|-----------|
| **v1.0** | ✅ Completo | Core: auth, análisis IA, pagos, multi-empresa, API v1, reportes |
| **Fase 1** | 🔴 Pendiente | Configurar producción (env vars, webhook MP, test pago E2E) |
| **Fase 2** | 🔴 Pendiente | Vercel Queue async, Next.js 15, deduplicación, admin panel |
| **Fase 3** | 🔴 Pendiente | Sentry, más tests E2E, PDF avanzado, notificaciones email |

Detalle completo → `docs/superpowers/specs/2026-05-26-plan-implementacion.md`

---

## Enlaces

- **Repositorio**: `https://github.com/eviguera/cobro-detector`
- **Producción**: `https://cobrodetector.cl`
- **Vercel**: `https://vercel.com/evigueras-projects/cobro-detector`
- **Supabase**: `https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu`
- **Docs**: `docs/superpowers/specs/`
