---
name: cobro-detector-db
description: "Especialista en la base de datos de CobroDetector. Conoce el schema completo: 12 tablas, índices, RLS, políticas, funciones (SECURITY DEFINER/INVOKER), triggers, vistas, constraints. Usar al hacer cambios de schema, crear migraciones, auditar seguridad, optimizar queries, o entender la estructura de datos del proyecto."
metadata:
  author: cobro-detector
  version: "1.0.0"
  date: 2026-05-21
---

# CobroDetector — Schema de Base de Datos

Base de datos PostgreSQL gestionada con Supabase. Schema consolidado en `supabase/schema.sql`.

---

## Arquitectura General

- **Schemas**: `public` (expuesto a REST API) + `internal` (privado, solo accesible desde funciones)
- **Auth**: Supabase Auth → `auth.users` → trigger `handle_new_user` → tabla `profiles`
- **RLS**: Habilitado en 12 tablas
- **Políticas**: 38 políticas RLS, todas basadas en `auth.uid() = user_id`
- **Vistas**: 2 vistas con `security_invoker = true`
- **Triggers**: 8 triggers (incluye orders_updated_at y analyses_updated_at agregados 2026-05-25)

---

## Sección 1: Tablas (12 tablas)

### 1.1 `profiles` — Extiende auth.users
```
Columnas:
  id            UUID PK REFERENCES auth.users(id) ON DELETE CASCADE
  email         TEXT
  full_name     TEXT
  business_name TEXT
  business_type TEXT
  rut           TEXT
  phone         TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT (auth.uid() = id), INSERT (auth.uid() = id), UPDATE (auth.uid() = id)
Trigger: profiles_updated_at → update_updated_at()
```
Creado automáticamente por `handle_new_user()` al registrarse en auth.users.

### 1.2 `companies` — Empresas de contadores
```
Columnas:
  id            UUID PK DEFAULT gen_random_uuid()
  accountant_id UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  company_name  TEXT NOT NULL
  business_name TEXT
  rut           TEXT
  email         TEXT
  phone         TEXT
  address       TEXT
  industry      TEXT
  is_active     BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE/DELETE (auth.uid() = accountant_id)
Trigger: companies_updated_at → update_companies_updated_at()
Índices: companies_accountant_id_idx(accountant_id)
```

### 1.3 `credits` — Créditos por usuario/empresa
```
Columnas:
  id         UUID PK DEFAULT gen_random_uuid()
  user_id    UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  company_id UUID FK→companies(id) ON DELETE SET NULL
  total      INTEGER NOT NULL DEFAULT 0
  used       INTEGER NOT NULL DEFAULT 0
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()

Constraints:
  UNIQUE (user_id, company_id)      — un row por usuario+empresa
  CHECK (used <= total)             — usado nunca excede total

RLS: SELECT/INSERT/UPDATE (auth.uid() = user_id)
Trigger: credits_updated_at → update_updated_at()
Índices: idx_credits_user_id, idx_credits_company_id, idx_credits_user_company(user_id, company_id)
```

### 1.4 `api_keys` — API keys para acceso programático
```
Columnas:
  id           UUID PK DEFAULT gen_random_uuid()
  user_id      UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  name         TEXT NOT NULL
  key_hash     TEXT NOT NULL UNIQUE        — SHA-256 del key
  key_prefix   TEXT NOT NULL               — prefijo visible (ej: "ck_")
  permissions  TEXT[] DEFAULT ['read']     — ['read'] | ['read','write'] | ['admin']
  is_active    BOOLEAN DEFAULT true
  last_used_at TIMESTAMPTZ
  expires_at   TIMESTAMPTZ
  created_at   TIMESTAMPTZ DEFAULT NOW()
  updated_at   TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
Trigger: api_keys_updated_at → update_api_keys_updated_at()
Índices: idx_api_keys_user_id, api_keys_key_hash_idx(key_hash)
```

### 1.5 `payment_methods` — Métodos de pago (MercadoPago)
```
Columnas:
  id              UUID PK DEFAULT gen_random_uuid()
  user_id         UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  mp_card_token   TEXT NOT NULL
  mp_customer_id  TEXT
  last_four_digits TEXT
  card_brand      TEXT
  expires_month   INTEGER
  expires_year    INTEGER
  is_default      BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
Trigger: payment_methods_updated_at → update_payment_methods_updated_at()
Índices: payment_methods_user_id_idx(user_id)
```

### 1.6 `orders` — Órdenes de compra (MercadoPago + success_plan)
```
Columnas:
  id                  UUID PK DEFAULT gen_random_uuid()
  user_id             UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  company_id          UUID FK→companies(id) ON DELETE SET NULL
  plan                TEXT NOT NULL
  credits_purchased   INTEGER NOT NULL DEFAULT 0
  amount_clp          INTEGER NOT NULL DEFAULT 0
  status              TEXT DEFAULT 'pending'
  payment_provider    TEXT DEFAULT 'manual'
  payment_reference   TEXT
  recovered_amount    BIGINT DEFAULT 0
  fee_percentage      INTEGER DEFAULT 0
  mp_preference_id    TEXT
  mp_payment_id       TEXT
  mp_status           TEXT
  mp_detail           TEXT
  metadata            JSONB DEFAULT '{}'
  success_plan_active BOOLEAN DEFAULT false
  created_at          TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE (auth.uid() = user_id)
Índices: idx_orders_user_id, idx_orders_user_status, idx_orders_status,
         idx_orders_created_at, idx_orders_company_id,
         orders_mp_preference_id_idx, orders_mp_payment_id_idx
```
Nota: no tiene `updated_at` ni trigger de actualización automática.

### 1.7 `analyses` — Análisis de archivos
```
Columnas:
  id                 UUID PK DEFAULT gen_random_uuid()
  user_id            UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  company_id         UUID FK→companies(id) ON DELETE SET NULL
  file_name          TEXT NOT NULL
  file_type          TEXT NOT NULL       — 'csv' | 'xlsx' | 'pdf'
  file_url           TEXT
  bank               TEXT
  period_start       DATE
  period_end         DATE
  total_transactions INTEGER DEFAULT 0
  anomalies_count    INTEGER DEFAULT 0
  recoverable_amount BIGINT DEFAULT 0
  status             TEXT DEFAULT 'processing'  — 'processing' | 'completed' | 'awaiting_payment' | 'error'
  raw_data           JSONB              — transacciones parseadas
  anomalies          JSONB              — anomalías detectadas
  ai_summary         TEXT
  created_at         TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
Índices: idx_analyses_user_id, idx_analyses_user_created, idx_analyses_status,
         idx_analyses_created_at, idx_analyses_company_id
```
Nota: no tiene `updated_at`. Las actualizaciones van directo a `status`.

### 1.8 `anomalies` — Anomalías detectadas por análisis
```
Columnas:
  id                UUID PK DEFAULT gen_random_uuid()
  analysis_id       UUID FK→analyses(id) ON DELETE CASCADE NOT NULL
  user_id           UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  type              TEXT NOT NULL          — 'duplicate_commission' | 'incorrect_charge' | 'missing_transaction' | ...
  severity          TEXT NOT NULL          — 'high' | 'medium' | 'low'
  title             TEXT NOT NULL
  description       TEXT
  detail            TEXT
  recoverable_amount BIGINT NOT NULL DEFAULT 0
  transaction_refs  JSONB DEFAULT '[]'    — IDs de transacciones relacionadas
  status            TEXT DEFAULT 'pending' — 'pending' | 'claimed' | 'resolved' | 'dismissed'
  created_at        TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE (auth.uid() = user_id)
Índices: idx_anomalies_user_id, idx_anomalies_analysis_id, idx_anomalies_type_status(type, status)
```

### 1.9 `success_charges` — Cobros de success fee (plan Platino)
```
Columnas:
  id               UUID PK DEFAULT gen_random_uuid()
  user_id          UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  anomaly_id       UUID FK→anomalies(id) ON DELETE SET NULL
  analysis_id      UUID FK→analyses(id) ON DELETE SET NULL
  recovered_amount BIGINT NOT NULL
  fee_percentage   INTEGER NOT NULL DEFAULT 10
  charge_amount    BIGINT NOT NULL
  status           TEXT DEFAULT 'pending'  — 'pending' | 'charged' | 'failed'
  mp_payment_id    TEXT
  mp_status        TEXT
  mp_detail        TEXT
  charged_at       TIMESTAMPTZ
  created_at       TIMESTAMPTZ DEFAULT NOW()

Constraints: CHECK (fee_percentage >= 0 AND fee_percentage <= 100)
RLS: SELECT/INSERT/UPDATE (auth.uid() = user_id)
Índices: success_charges_user_id_idx, success_charges_status_idx, success_charges_anomaly_id_idx
```

### 1.10 `api_logs` — Logs de uso de API keys
```
Columnas:
  id              UUID PK DEFAULT gen_random_uuid()
  api_key_id      UUID FK→api_keys(id) ON DELETE SET NULL
  user_id         UUID FK→profiles(id) ON DELETE CASCADE
  endpoint        TEXT NOT NULL
  method          TEXT NOT NULL
  status_code     INTEGER NOT NULL
  ip_address      TEXT
  user_agent      TEXT
  request_body    JSONB
  response_time_ms INTEGER
  created_at      TIMESTAMPTZ DEFAULT NOW()

RLS: NO HABILITADO ⚠️
Índices: api_logs_api_key_id_idx, api_logs_created_at_idx
```
⚠️ Esta tabla no tiene RLS. Es la única tabla expuesta sin protección a nivel de fila.

### 1.11 `company_members` — Miembros de empresas (multi-usuario)
```
Columnas:
  id         UUID PK DEFAULT gen_random_uuid()
  company_id UUID FK→companies(id) ON DELETE CASCADE NOT NULL
  user_id    UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  role       TEXT NOT NULL DEFAULT 'member'  — 'member' | 'admin' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id)
Índices: idx_company_members_user_id, idx_company_members_company_id,
         idx_company_members_user_company(user_id, company_id)
```

### 1.12 `success_plans` — Planes de success fee activos
```
Columnas:
  id         UUID PK DEFAULT gen_random_uuid()
  user_id    UUID FK→profiles(id) ON DELETE CASCADE NOT NULL
  company_id UUID FK→companies(id) ON DELETE SET NULL
  plan_type  TEXT NOT NULL
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ends_at    TIMESTAMPTZ
  is_active  BOOLEAN NOT NULL DEFAULT true
  created_at TIMESTAMPTZ DEFAULT NOW()

RLS: SELECT/INSERT/UPDATE (auth.uid() = user_id)
Índices: idx_success_plans_user_id, idx_success_plans_active(is_active) WHERE is_active = true
```

---

## Sección 2: Constraints

| Nombre | Tabla | Tipo | Definición |
|--------|-------|------|------------|
| `credits_user_company_unique` | credits | UNIQUE | `(user_id, company_id)` |
| `credits_used_check` | credits | CHECK | `used <= total` |
| `success_charges_fee_check` | success_charges | CHECK | `fee_percentage >= 0 AND fee_percentage <= 100` |

---

## Sección 3: Índices (30+)

### Por tabla:
| Tabla | Índices |
|-------|---------|
| analyses | `idx_analyses_user_id`, `idx_analyses_user_created(user_id, created_at DESC)`, `idx_analyses_status`, `idx_analyses_created_at(created_at DESC)`, `idx_analyses_company_id` |
| anomalies | `idx_anomalies_user_id`, `idx_anomalies_analysis_id`, `idx_anomalies_type_status(type, status)` |
| credits | `idx_credits_user_id`, `idx_credits_company_id`, `idx_credits_user_company(user_id, company_id)` |
| orders | `idx_orders_user_id`, `idx_orders_user_status`, `idx_orders_status`, `idx_orders_created_at`, `idx_orders_company_id`, `orders_mp_preference_id_idx`, `orders_mp_payment_id_idx` |
| api_keys | `idx_api_keys_user_id`, `api_keys_key_hash_idx(key_hash)` |
| api_logs | `api_logs_api_key_id_idx`, `api_logs_created_at_idx` |
| payment_methods | `payment_methods_user_id_idx` |
| success_charges | `success_charges_user_id_idx`, `success_charges_status_idx`, `success_charges_anomaly_id_idx` |
| companies | `companies_accountant_id_idx` |
| company_members | `idx_company_members_user_id`, `idx_company_members_company_id`, `idx_company_members_user_company(user_id, company_id)` |
| success_plans | `idx_success_plans_user_id`, `idx_success_plans_active(is_active) WHERE is_active = true` |

---

## Sección 4: RLS — Políticas por Tabla (38 políticas)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | — |
| companies | `auth.uid() = accountant_id` | `auth.uid() = accountant_id` | `auth.uid() = accountant_id` | `auth.uid() = accountant_id` |
| credits | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| orders | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| analyses | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| anomalies | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| api_keys | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| payment_methods | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| success_charges | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| company_members | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| success_plans | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| api_logs | ❌ SIN RLS | — | — | — |

**Patrón**: Todas las políticas usan `auth.uid() = user_id` excepto `companies` que usa `accountant_id`.

---

## Sección 5: Funciones

### Schema `internal` (privado — SECURITY DEFINER)

| Función | Args | Retorna | Propósito |
|---------|------|---------|-----------|
| `internal.verify_api_key` | `key_text TEXT` | `TABLE(valid BOOL, key_id UUID, user_id UUID, permissions TEXT[], rate_limit INT)` | Valida API key por SHA-256 hash |
| `internal.consume_credit` | `p_user_id UUID, p_company_id UUID` | `BOOLEAN` | Consume 1 crédito atómicamente (FOR UPDATE) |
| `internal.can_access_company` | `company_uuid UUID` | `BOOLEAN` | Verifica si auth.uid() = accountant_id |

### Schema `public` (wrappers)

| Función | Args | Retorna | Security | Propósito |
|---------|------|---------|----------|-----------|
| `public.verify_api_key` | `key_text TEXT` | `TABLE(...)` | SECURITY DEFINER | Wrapper para auth sin sesión |
| `public.consume_credit` | `p_company_id UUID` | `BOOLEAN` | SECURITY INVOKER | Usa auth.uid(), no acepta user_id externo |
| `public.can_access_company` | `company_uuid UUID` | `BOOLEAN` | SECURITY INVOKER | Wrapper para uso desde app |

### Funciones trigger (schema `public`)

| Función | Tipo |
|---------|------|
| `update_updated_at()` | Trigger — actualiza `updated_at = NOW()` (usado por profiles, credits) |
| `update_payment_methods_updated_at()` | Trigger — usado por payment_methods |
| `update_companies_updated_at()` | Trigger — usado por companies |
| `update_api_keys_updated_at()` | Trigger — usado por api_keys |
| `handle_new_user()` | Trigger SECURITY DEFINER — crea profile + 1 crédito al registrarse en auth.users |
| `cleanup_old_api_logs()` | Utilidad — limpia api_logs > 30 días |

---

## Sección 6: Triggers

| Trigger | Tabla | Evento | Función |
|---------|-------|--------|---------|
| `on_auth_user_created` | auth.users | AFTER INSERT | handle_new_user() |
| `profiles_updated_at` | profiles | BEFORE UPDATE | update_updated_at() |
| `credits_updated_at` | credits | BEFORE UPDATE | update_updated_at() |
| `companies_updated_at` | companies | BEFORE UPDATE | update_companies_updated_at() |
| `payment_methods_updated_at` | payment_methods | BEFORE UPDATE | update_payment_methods_updated_at() |
| `api_keys_updated_at` | api_keys | BEFORE UPDATE | update_api_keys_updated_at() |

---

## Sección 7: Vistas (`security_invoker = true`)

### `orders_with_credits`
```sql
SELECT o.*, p.email, p.full_name, p.business_name,
       c.total AS credits_total, c.used AS credits_used,
       (c.total - c.used) AS credits_available
FROM orders o
JOIN profiles p ON p.id = o.user_id
JOIN credits c ON c.user_id = o.user_id
```

### `analyses_with_company`
```sql
SELECT a.*, c.company_name, c.business_name AS company_business_name, c.rut AS company_rut
FROM analyses a
LEFT JOIN companies c ON c.id = a.company_id
```

---

## Sección 8: Grants

```
-- Schema internal: privado, solo authenticated
REVOKE ALL ON SCHEMA internal FROM PUBLIC;
GRANT USAGE ON SCHEMA internal TO authenticated;

-- Wrappers públicos
GRANT EXECUTE ON FUNCTION public.verify_api_key(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID) TO authenticated;

-- Funciones internas
GRANT EXECUTE ON FUNCTION internal.consume_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.verify_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.can_access_company(UUID) TO authenticated;
```

---

## Sección 9: Convenciones y Reglas

### Al modificar el schema:
1. **Nunca usar `apply_migration`** para cambios iterativos. Usar `execute_sql` (MCP) para aplicar cambios.
2. **Actualizar `supabase/schema.sql`** con los cambios aplicados.
3. **Actualizar `src/types/database.types.ts`** si se añaden/modifican tablas, columnas o funciones.
4. **Ejecutar advisors** de seguridad después de cambios DDL.
5. **Toda tabla nueva debe tener RLS habilitado** con políticas `auth.uid() = user_id`.
6. **Funciones SECURITY DEFINER van en schema `internal`**, wrappers en `public`.
7. **Usar `IF NOT EXISTS` / `CREATE OR REPLACE`** para que el schema.sql sea idempotente.
8. **Constraints se añaden con bloques `DO $$`** para evitar errores si ya existen.

### Al crear nuevas funciones:
- Si accede a datos sin pasar por RLS → **SECURITY DEFINER en schema `internal`**
- Si el caller está autenticado y deriva user de `auth.uid()` → **SECURITY INVOKER en schema `public`**
- Si necesita ser llamada sin autenticación → **SECURITY DEFINER en schema `public`** (wrapper fino a internal)

### TypeScript:
- Tipos en `src/types/database.types.ts` son **mantenidos manualmente**.
- El helper `tables(client)` en `src/lib/supabase/db.ts` usa `as any` para bypass del bug de `@supabase/ssr`.
- Llamadas RPC desde el código siempre van al schema `public` (las de `internal` son inaccesibles vía REST API).

---

## Sección 10: Issues Conocidos

1. **`handle_new_user` en `public` con SECURITY DEFINER** — si bien su ejecución está revocada a `anon`/`authenticated`, la función sigue en schema `public`. Idealmente debería moverse a `internal`.
2. ~~`api_logs` sin RLS~~ — **Resuelto**: RLS habilitado con políticas SELECT/INSERT.
3. ~~`orders` sin `updated_at` ni trigger~~ — **Resuelto**: columna `updated_at` y trigger `orders_updated_at` agregados (2026-05-25).
4. ~~`analyses` sin `updated_at`~~ — **Resuelto**: columna `updated_at` y trigger `analyses_updated_at` agregados (2026-05-25).
5. ~~`search_path` no configurado~~ — **Resuelto**: las 12 funciones tienen `SET search_path = 'public'` o `SET search_path = ''`.

---

## Sección 11: Flujo de Auth y API Keys

1. Usuario se registra → `auth.users` → trigger `handle_new_user()` → crea `profiles` + 1 crédito.
2. App llama `authenticateApiRequest()` en `src/lib/api-auth.ts`.
3. Esta función crea un `createClient()` (anon key, sin sesión) y llama `public.verify_api_key(key_text)` vía RPC.
4. El wrapper público (SECURITY DEFINER) delega en `internal.verify_api_key(key_text)`.
5. La función interna hace SHA-256 del key_text, busca en `api_keys` por hash, verifica expiración.
6. Retorna `{ valid, key_id, user_id, permissions, rate_limit }`.

---

## Sección 12: Flujo de Consumo de Créditos

1. App llama `consumeCreditAtomic()` en `src/lib/services/credit.service.ts`.
2. Intenta `supabase.rpc('consume_credit', { p_company_id })` — sin pasar `user_id`.
3. El wrapper `public.consume_credit(p_company_id)` (SECURITY INVOKER) obtiene `auth.uid()`.
4. Llama a `internal.consume_credit(auth.uid(), p_company_id)` (SECURITY DEFINER).
5. La función interna hace `SELECT ... FOR UPDATE` sobre `credits`, verifica `used < total`, incrementa `used`.
6. Si la RPC falla (función no encontrada), hay fallback CAS (compare-and-swap) en el código TypeScript.
