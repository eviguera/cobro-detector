# Backend Schema — CobroDetector

> **CobroDetector** | v1.0 | Mayo 2026
>
> Documento de arquitectura de datos y API. Schema completo de base de datos, endpoints y seguridad.
>
> **Documentos relacionados**: [PRD](./2026-05-26-prd.md) · [TRD](./2026-05-26-trd.md) · [UI/UX](./2026-05-26-ui-ux.md) · [Flujos](./2026-05-26-flujos.md) · [Plan](./2026-05-26-plan-implementacion.md)

---

## Resumen

Base de datos PostgreSQL gestionada con Supabase. Schema consolidado en `supabase/schema.sql` (689 líneas).

| Métrica | Valor |
|---------|-------|
| **Tablas** | 12 |
| **Schemas** | 2 (`public` + `internal`) |
| **Vistas** | 2 (security_invoker) |
| **Políticas RLS** | 38 |
| **Triggers** | 8 |
| **Funciones** | 9 (3 internal + 3 public + 4 trigger + 1 utilidad) |
| **Índices** | 30+ |
| **Constraints** | 3 |

---

## Diagrama Entidad-Relación

```
auth.users
    │
    │ (1:1, trigger handle_new_user)
    ▼
┌──────────────┐       ┌──────────────────┐
│   profiles   │──────>│  company_members  │
│              │       │  (user_id FK)     │
└──────┬───────┘       └────────┬─────────┘
       │                        │
       │ (1:N)                  │ (N:1)
       │                        │
       ├────────────────────────┤
       │                        ▼
       │               ┌──────────────┐
       │               │  companies   │
       │               │ (accountant  │
       │               │  _id FK)     │
       │               └──────┬───────┘
       │                      │
       │         ┌────────────┼────────────┐
       │         │            │            │
       ▼         ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│  credits │ │ analyses │ │  orders  │ │ success_plans │
│(user_id, │ │(user_id, │ │(user_id, │ │(user_id,     │
│company_id│ │company_id│ │company_id│ │ company_id)   │
│  FK)     │ │  FK)     │ │  FK)     │ │              │
└──────────┘ └────┬─────┘ └──────────┘ └──────────────┘
                  │
                  │ (1:N)
                  ▼
            ┌──────────────┐       ┌──────────────┐
            │  anomalies   │──────>│success_charges│
            │(analysis_id, │       │(anomaly_id,  │
            │ user_id FK)  │       │ analysis_id  │
            └──────────────┘       │ FK)          │
                                   └──────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   api_keys   │──────>│   api_logs   │       │   payment    │
│  (user_id FK)│       │(api_key_id,  │       │   _methods   │
└──────────────┘       │ user_id FK)  │       │  (user_id FK)│
                       └──────────────┘       └──────────────┘
```

---

## Tablas

### 1. `profiles` — Perfiles de Usuario

Extiende `auth.users`. Creado automáticamente por trigger al registrarse.

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK, FK→auth.users(id) CASCADE | ID de usuario |
| `email` | TEXT | - | Email |
| `full_name` | TEXT | - | Nombre completo |
| `business_name` | TEXT | - | Nombre del negocio |
| `business_type` | TEXT | - | Tipo de negocio |
| `rut` | TEXT | - | RUT chileno |
| `phone` | TEXT | - | Teléfono |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = id`
**Trigger**: `profiles_updated_at` → `update_updated_at()`

---

### 2. `companies` — Empresas (Multi-Tenant)

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | ID empresa |
| `accountant_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Contador dueño |
| `company_name` | TEXT | NOT NULL | Nombre empresa |
| `business_name` | TEXT | - | Nombre de fantasía |
| `rut` | TEXT | - | RUT empresa |
| `email` | TEXT | - | Email contacto |
| `phone` | TEXT | - | Teléfono |
| `address` | TEXT | - | Dirección |
| `industry` | TEXT | - | Rubro/industria |
| `is_active` | BOOLEAN | DEFAULT true | Empresa activa |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE/DELETE con `auth.uid() = accountant_id`
**Trigger**: `companies_updated_at`
**Índices**: `companies_accountant_id_idx(accountant_id)`

---

### 3. `credits` — Créditos de Análisis

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `company_id` | UUID | FK→companies(id) SET NULL | Empresa (si aplica) |
| `total` | INTEGER | NOT NULL, DEFAULT 0 | Créditos totales |
| `used` | INTEGER | NOT NULL, DEFAULT 0 | Créditos usados |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**Constraints**:
- `credits_user_company_unique`: UNIQUE(user_id, company_id)
- `credits_used_check`: CHECK(used <= total)

**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = user_id`
**Trigger**: `credits_updated_at`
**Índices**: `idx_credits_user_id`, `idx_credits_company_id`, `idx_credits_user_company`

---

### 4. `api_keys` — API Keys

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `name` | TEXT | NOT NULL | Nombre descriptivo |
| `key_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 del key |
| `key_prefix` | TEXT | NOT NULL | Prefijo visible (ej: "ck_") |
| `permissions` | TEXT[] | DEFAULT ['read'] | read / write / admin |
| `is_active` | BOOLEAN | DEFAULT true | Key activa |
| `last_used_at` | TIMESTAMPTZ | - | Último uso |
| `expires_at` | TIMESTAMPTZ | - | Expiración |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE/DELETE con `auth.uid() = user_id`
**Trigger**: `api_keys_updated_at`
**Índices**: `idx_api_keys_user_id`, `api_keys_key_hash_idx`

---

### 5. `payment_methods` — Métodos de Pago

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `mp_card_token` | TEXT | NOT NULL | Token tarjeta MP |
| `mp_customer_id` | TEXT | - | ID cliente MP |
| `last_four_digits` | TEXT | - | Últimos 4 dígitos |
| `card_brand` | TEXT | - | Marca tarjeta |
| `expires_month` | INTEGER | - | Mes expiración |
| `expires_year` | INTEGER | - | Año expiración |
| `is_default` | BOOLEAN | DEFAULT true | Es default |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE/DELETE con `auth.uid() = user_id`
**Índices**: `payment_methods_user_id_idx`

---

### 6. `orders` — Órdenes de Compra

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID orden |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `company_id` | UUID | FK→companies(id) SET NULL | Empresa |
| `plan` | TEXT | NOT NULL | Plan comprado |
| `credits_purchased` | INTEGER | NOT NULL, DEFAULT 0 | Créditos comprados |
| `amount_clp` | INTEGER | NOT NULL, DEFAULT 0 | Monto en CLP |
| `status` | TEXT | DEFAULT 'pending' | pending / paid / failed |
| `payment_provider` | TEXT | DEFAULT 'manual' | mercadopago / manual |
| `payment_reference` | TEXT | - | Referencia pago |
| `recovered_amount` | BIGINT | DEFAULT 0 | Monto recuperado (Platino) |
| `fee_percentage` | INTEGER | DEFAULT 0 | % fee (Platino) |
| `mp_preference_id` | TEXT | - | ID preferencia MP |
| `mp_payment_id` | TEXT | - | ID pago MP |
| `mp_status` | TEXT | - | Estado MP |
| `mp_detail` | TEXT | - | Detalle MP |
| `metadata` | JSONB | DEFAULT '{}' | Metadata extra |
| `success_plan_active` | BOOLEAN | DEFAULT false | Plan Platino activo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = user_id`
**Trigger**: `orders_updated_at`
**Índices**: `idx_orders_user_id`, `idx_orders_user_status`, `idx_orders_status`, `idx_orders_created_at`, `idx_orders_company_id`, `orders_mp_preference_id_idx`, `orders_mp_payment_id_idx`

---

### 7. `analyses` — Análisis

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID análisis |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `company_id` | UUID | FK→companies(id) SET NULL | Empresa |
| `file_name` | TEXT | NOT NULL | Nombre archivo |
| `file_type` | TEXT | NOT NULL | csv / xlsx / pdf |
| `file_url` | TEXT | - | URL en Storage |
| `bank` | TEXT | - | Banco detectado |
| `period_start` | DATE | - | Inicio del período |
| `period_end` | DATE | - | Fin del período |
| `total_transactions` | INTEGER | DEFAULT 0 | Total transacciones |
| `anomalies_count` | INTEGER | DEFAULT 0 | Anomalías detectadas |
| `recoverable_amount` | BIGINT | DEFAULT 0 | Monto recuperable |
| `status` | TEXT | DEFAULT 'processing' | processing / completed / awaiting_payment / error |
| `raw_data` | JSONB | - | Transacciones parseadas |
| `anomalies` | JSONB | - | Anomalías (legacy) |
| `ai_summary` | TEXT | - | Resumen IA |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**RLS**: SELECT/INSERT/UPDATE/DELETE con `auth.uid() = user_id`
**Trigger**: `analyses_updated_at`
**Índices**: `idx_analyses_user_id`, `idx_analyses_user_created`, `idx_analyses_status`, `idx_analyses_created_at`, `idx_analyses_company_id`

---

### 8. `anomalies` — Anomalías Detectadas

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `analysis_id` | UUID | FK→analyses(id) CASCADE, NOT NULL | Análisis |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `type` | TEXT | NOT NULL | duplicate_commission / incorrect_charge / missing_transaction / ... |
| `severity` | TEXT | NOT NULL | high / medium / low |
| `title` | TEXT | NOT NULL | Título |
| `description` | TEXT | - | Descripción |
| `detail` | TEXT | - | Detalle técnico |
| `recoverable_amount` | BIGINT | NOT NULL, DEFAULT 0 | Monto recuperable |
| `transaction_refs` | JSONB | DEFAULT '[]' | IDs de transacciones |
| `status` | TEXT | DEFAULT 'pending' | pending / claimed / resolved / dismissed |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |

**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = user_id`
**Índices**: `idx_anomalies_user_id`, `idx_anomalies_analysis_id`, `idx_anomalies_type_status`

---

### 9. `success_charges` — Cobros Success Fee

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `anomaly_id` | UUID | FK→anomalies(id) SET NULL | Anomalía |
| `analysis_id` | UUID | FK→analyses(id) SET NULL | Análisis |
| `recovered_amount` | BIGINT | NOT NULL | Monto recuperado |
| `fee_percentage` | INTEGER | NOT NULL, DEFAULT 10 | % fee |
| `charge_amount` | BIGINT | NOT NULL | Monto cobrado |
| `status` | TEXT | DEFAULT 'pending' | pending / charged / failed |
| `mp_payment_id` | TEXT | - | ID pago MP |
| `mp_status` | TEXT | - | Estado MP |
| `mp_detail` | TEXT | - | Detalle MP |
| `charged_at` | TIMESTAMPTZ | - | Fecha cobro |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |

**Constraints**: CHECK(fee_percentage >= 0 AND fee_percentage <= 100)
**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = user_id`
**Índices**: `success_charges_user_id_idx`, `success_charges_status_idx`, `success_charges_anomaly_id_idx`

---

### 10. `api_logs` — Logs de API

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `api_key_id` | UUID | FK→api_keys(id) SET NULL | API key |
| `user_id` | UUID | FK→profiles(id) CASCADE | Usuario |
| `endpoint` | TEXT | NOT NULL | Endpoint |
| `method` | TEXT | NOT NULL | HTTP method |
| `status_code` | INTEGER | NOT NULL | Código respuesta |
| `ip_address` | TEXT | - | IP |
| `user_agent` | TEXT | - | User agent |
| `request_body` | JSONB | - | Body request |
| `response_time_ms` | INTEGER | - | Tiempo respuesta |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha |

**⚠️ RLS**: No habilitado (pendiente)
**Índices**: `api_logs_api_key_id_idx`, `api_logs_created_at_idx`

---

### 11. `company_members` — Miembros de Empresa

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `company_id` | UUID | FK→companies(id) CASCADE, NOT NULL | Empresa |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `role` | TEXT | NOT NULL, DEFAULT 'member' | member / admin / viewer |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |

**RLS**: SELECT/INSERT/UPDATE/DELETE con `auth.uid() = user_id`
**Índices**: `idx_company_members_user_id`, `idx_company_members_company_id`, `idx_company_members_user_company`

---

### 12. `success_plans` — Planes Success Fee Activos

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PK | ID |
| `user_id` | UUID | FK→profiles(id) CASCADE, NOT NULL | Usuario |
| `company_id` | UUID | FK→companies(id) SET NULL | Empresa |
| `plan_type` | TEXT | NOT NULL | Tipo plan |
| `starts_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Inicio |
| `ends_at` | TIMESTAMPTZ | - | Fin |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Activo |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha creación |

**RLS**: SELECT/INSERT/UPDATE con `auth.uid() = user_id`
**Índices**: `idx_success_plans_user_id`, `idx_success_plans_active` (partial WHERE is_active = true)

---

## Funciones

### Schema `internal` (Privado — SECURITY DEFINER)

| Función | Args | Retorna | Propósito |
|---------|------|---------|-----------|
| `internal.verify_api_key` | `key_text TEXT` | `TABLE(valid BOOL, key_id UUID, user_id UUID, permissions TEXT[], rate_limit INT)` | Valida API key por SHA-256 hash |
| `internal.consume_credit` | `p_user_id UUID, p_company_id UUID` | `BOOLEAN` | Consume 1 crédito atómicamente (SELECT FOR UPDATE) |
| `internal.can_access_company` | `company_uuid UUID` | `BOOLEAN` | Verifica si auth.uid() = accountant_id |

### Schema `public` (Wrappers)

| Función | Args | Retorna | Security | Propósito |
|---------|------|---------|----------|-----------|
| `public.verify_api_key` | `key_text TEXT` | `TABLE(...)` | SECURITY DEFINER | Wrapper para auth sin sesión (necesario: llamado por anon) |
| `public.consume_credit` | `p_company_id UUID` | `BOOLEAN` | SECURITY INVOKER | Usa auth.uid(), no acepta user_id externo |
| `public.can_access_company` | `company_uuid UUID` | `BOOLEAN` | SECURITY INVOKER | Wrapper para uso desde app |

### Funciones Trigger / Utilidad

| Función | Tipo |
|---------|------|
| `update_updated_at()` | Trigger — actualiza `updated_at = NOW()` |
| `update_payment_methods_updated_at()` | Trigger |
| `update_companies_updated_at()` | Trigger |
| `update_api_keys_updated_at()` | Trigger |
| `handle_new_user()` | Trigger SECURITY DEFINER — crea profile + 1 crédito al registrarse |
| `cleanup_old_api_logs()` | Utilidad — limpia api_logs > 30 días |

---

## Vistas (`security_invoker = true`)

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

## API Endpoints

### Endpoints con Auth de Sesión

| Método | Ruta | Zod Schema | Rate Limit | Descripción |
|--------|------|------------|------------|-------------|
| `POST` | `/api/analyze` | `{ file: File, plan?: enum }` | 3/60s | Upload + análisis |
| `DELETE` | `/api/analyses/[id]` | `{ id: UUID }` | - | Eliminar análisis |
| `POST` | `/api/payments/create` | `{ planKey: enum }` | - | Crear preferencia MP |
| `POST` | `/api/payments/unlock-report` | `{ analysisId: UUID }` | - | Pagar 20% Platino |
| `GET` | `/api/companies` | - | - | Listar empresas |
| `POST` | `/api/companies` | `{ company_name, rut?, ... }` | - | Crear empresa |
| `GET` | `/api/companies/[id]` | `{ id: UUID }` | - | Ver empresa |
| `PATCH` | `/api/companies/[id]` | `{ company_name?, ... }` | - | Actualizar empresa |
| `DELETE` | `/api/companies/[id]` | `{ id: UUID }` | - | Desactivar empresa |
| `POST` | `/api/documents/complaint-letter` | `{ analysisId: UUID }` | - | Generar DOCX |
| `POST` | `/api/documents/complaint-letter/pdf` | `{ analysisId: UUID }` | - | Generar PDF |
| `POST` | `/api/logout` | - | - | Logout CSRF-safe |

### Endpoints Públicos

| Método | Ruta | Auth | Rate Limit | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/health` | Ninguna | 3/60s | Health check |
| `POST` | `/api/payments/webhook` | HMAC-SHA256 | - | Webhook MP |
| `POST` | `/api/auth/check-rate-limit` | Ninguna | 5/60s | Rate limit auth |

### API v1

| Método | Ruta | Auth | Rate Limit | Descripción |
|--------|------|------|------------|-------------|
| `GET` | `/api/v1/analyses/[id]` | Bearer API Key | Por key | Obtener análisis |

---

## Pipeline de Análisis

```
┌─────────────────────────────────────────────────────────────┐
│                     POST /api/analyze                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Rate Limiting (3 req/60s por IP)                         │
│  2. Auth (supabase.auth.getUser())                           │
│  3. Zod Validation (file, plan)                              │
│  4. Upload a Supabase Storage                                │
│  5. createAnalysisRecord() ── verifica y consume créditos    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     analyzeFile(fileUrl)                      │
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐           │
│  │ Parser   │───>│ Detect   │───>│ 3 Capas en   │           │
│  │ CSV/Excel│    │ Bank     │    │ Paralelo     │           │
│  │ /PDF     │    │ (keyword)│    │              │           │
│  └──────────┘    └──────────┘    └──────┬───────┘           │
│                                         │                    │
│                    ┌────────────────────┼────────────┐      │
│                    ▼                    ▼            ▼      │
│            ┌────────────┐    ┌──────────────┐ ┌──────────┐ │
│            │ Reglas     │    │ Anomalías    │ │ IA       │ │
│            │ Determinís.│    │ Preetiquet.  │ │ (Groq)   │ │
│            │            │    │ (CSV)        │ │          │ │
│            │ • Comisión │    │ • COBRO_DOBLE│ │ • Llama  │ │
│            │   crédito  │    │ • COBRO_ALTO │ │   3.1 8B │ │
│            │   duplicada│    │ • COBRO_INCOR│ │ • JSON   │ │
│            │ • Duplicado│    │              │ │   mode   │ │
│            │   mes/monto│    │              │ │ • 30s    │ │
│            │ • Idénticos│    │              │ │   timeout│ │
│            │   7 días   │    │              │ │          │ │
│            │ • Cargos   │    │              │ │          │ │
│            │   genéricos│    │              │ │          │ │
│            └─────┬──────┘    └──────┬───────┘ └─────┬────┘ │
│                  └─────────────────┼────────────────┘      │
│                                    ▼                        │
│                        ┌──────────────────┐                │
│                        │ Combinar +       │                │
│                        │ Calcular período │                │
│                        │ y recuperable    │                │
│                        └──────────────────┘                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  UPDATE analyses SET status, anomalies_count,                 │
│    recoverable_amount, ai_summary, raw_data, anomalies        │
│  INSERT INTO anomalies (por cada anomalía detectada)         │
│  revalidatePath('/dashboard')                                 │
│  revalidatePath('/historial')                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Seguridad de Base de Datos

### Estructura de Privilegios

```
Schema public:
  ├── Tablas: RLS habilitado (12 tablas, 38 políticas)
  ├── Funciones: verify_api_key (SECURITY DEFINER, anon allowed)
  └── Grants: anon + authenticated tienen acceso vía API

Schema internal:
  ├── Tablas: ninguna
  ├── Funciones: SECURITY DEFINER (verify_api_key, consume_credit, can_access_company)
  └── Grants: SOLO authenticated. REVOKED from PUBLIC
```

### Reglas de Seguridad

1. **Toda tabla nueva debe tener RLS** con política `auth.uid() = user_id`
2. **Funciones SECURITY DEFINER** van en schema `internal`
3. **Wrappers públicos** son SECURITY INVOKER y derivan user de `auth.uid()`
4. **search_path** fijo: `SET search_path = 'public'` o `SET search_path = ''`
5. **Nunca exponer user_id como parámetro** en funciones SECURITY INVOKER
6. **Siempre usar `(SELECT auth.uid())`** en políticas RLS (evalúa una vez)

---

## Roadmap DB

### Pendiente

- [ ] Activar RLS en `api_logs` (SELECT/INSERT con `auth.uid() = user_id`)
- [ ] Mover `handle_new_user()` a schema `internal`
- [ ] Implementar soft-delete en `anomalies` (columna `deleted_at`)
- [ ] Agregar índices para queries frecuentes de dashboard
- [ ] Tabla `notifications` para push/email
- [ ] Migraciones automáticas con Supabase Migrations
- [ ] Particionamiento de `api_logs` por mes
