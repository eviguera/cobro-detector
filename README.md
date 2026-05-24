# CobroDetector

> Detecta cobros injustificados en estados de cuenta bancarios chilenos usando IA (Groq — Llama 3.1 8B).

---

## Estado del Proyecto

```
┌─────────────────────────────────────────────────────────┐
│                  PRUEBAS — 70/70 (100%)                  │
├─────────────────────────────────────────────────────────┤
│  Jest (unitarios)         ████████████████  15/15  ✅   │
│  E2E (Playwright)         ████████████████  10/10  ✅   │
│  QA Check                 ████████████████  45/45  ✅   │
├─────────────────────────────────────────────────────────┤
│                  ADVISORS                                │
├─────────────────────────────────────────────────────────┤
│  Security   🔴 0 ERROR   🟡 2 WARN (intencionales)      │
│  Performance 🟡 0 WARN    🔵 18 INFO (bajo tráfico)     │
├─────────────────────────────────────────────────────────┤
│                  DEPLOY                                  │
├─────────────────────────────────────────────────────────┤
│  Producción  https://project-qtyiz.vercel.app           │
│  Último deploy  23 Mayo 2026                           │
└─────────────────────────────────────────────────────────┘
```

### Mejoras recientes (Mayo 2026)

| Categoría | Mejora | Impacto |
|-----------|--------|---------|
| 🔒 Seguridad | `search_path` fijo en 10 funciones SECURITY DEFINER | Eliminado vector de injection |
| 🔒 Seguridad | `orders_with_credits` → SECURITY INVOKER | Vista corregida |
| 🔒 Seguridad | `handle_new_user()` revocado de PUBLIC | Ya no expuesto en REST API |
| 🔒 Seguridad | 15 políticas RLS duplicadas eliminadas | Schema limpio |
| 🔒 Seguridad | CSP arreglado (`'unsafe-inline'` en `script-src`) | Login roto reparado |
| ⚡ Rendimiento | 24 políticas RLS optimizadas `auth.uid()` → `(SELECT auth.uid())` | Evalúa 1 vez, no por fila |
| ⚡ Rendimiento | 3 covering indexes para FKs sin índice | JOINs optimizados |
| ⚡ Rendimiento | Detectores paralelizados `Promise.all` | Análisis ~60% más rápido |
| ⚡ Rendimiento | Timeout Groq 30s (`AbortController`) | Evita requests colgados |
| ⚡ Rendimiento | Índice duplicado `orders_status_idx` eliminado | DB optimizada |
| 🧪 Testing | Credenciales → `TEST_EMAIL` / `TEST_PASSWORD` env vars | Seguro, configurable |
| 🧪 Testing | Login helper compartido (`e2e/helpers/auth.ts`) | Código DRY |
| 🧪 Testing | CSV fixture `test-statement.csv` (16 filas, anomalías reales) | Datos de prueba |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend/Backend** | Next.js 14 (App Router) |
| **Base de datos** | Supabase (PostgreSQL + Auth + RLS + Storage) |
| **IA** | Groq (Llama 3.1 8B Instant) |
| **Pagos** | Mercado Pago |
| **Rate Limiting** | Upstash Redis |
| **Deploy** | Vercel |
| **UI** | Tailwind CSS |
| **Testing** | Jest (unit), Playwright (E2E) |

---

## Planes

| Plan | Análisis | Precio | Precio/análisis |
|------|----------|--------|-----------------|
| Inicial | 1 | $20.000 CLP | $20.000 |
| **Plus** | 2 | $30.000 CLP | $15.000 |
| Contador | 10 | $100.000 CLP | $10.000 |
| **Platino** | Ilimitado | **20% de lo recuperado** | Sin costo fijo |

- Los créditos no vencen.
- Plan Platino: subís tu archivo, detectamos los cobros, y solo pagás el 20% de lo que recuperes. El reporte se libera una vez acreditado el pago.
- Plan Contador: también podés elegir 20% de lo recuperado en vez de $100.000.

---

## Qué detecta

1. **Comisión de crédito duplicada** — La comisión de apertura se cobra UNA SOLA VEZ, no en cada cuota. Caso típico: venta en 6 cuotas sin interés, comisión duplicada en todas las cuotas.
2. **Errores en cuotas sin interés** — Ventas "sin interés" con montos de cuota inconsistentes.
3. **Cargos no reconocidos** — Cargos genéricos sin relación clara a una operación real.
4. **Cobros duplicados** — Misma operación cobrada dos veces en ventana de 7 días.
5. **Cobros incorrectos** — Detectados desde CSV con columna `tipo_anomalia`.

### Pipeline de detección

```
CSV/Excel/PDF → Parser → 3 capas de detección:
  1. Reglas determinísticas (rápido, sin IA)
  2. Anomalías pre-etiquetadas (desde CSV)
  3. IA (Groq Llama 3.1 8B)
→ Resultado combinado → Reporte detallado
```

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/eviguera/cobro-detector.git
cd cobro-detector
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecutá la migración consolidada en SQL Editor:
   - `supabase/schema.sql` (incluye todas las tablas, índices, RLS, funciones y vistas)
3. Copiá las credenciales en `.env.local`

### 3. Configurar Groq (IA gratuita)

1. Andá a [console.groq.com](https://console.groq.com)
2. Crea una API key
3. Agrégala a `.env.local`: `GROQ_API_KEY=tu-key`

### 4. Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# IA
GROQ_API_KEY=tu-groq-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx
MERCADOPAGO_WEBHOOK_SECRET=tu-secret

# Rate Limiting (opcional — graceful fallback si no configurado)
UPSTASH_REDIS_URL=https://tu-redis.upstash.io
UPSTASH_REDIS_TOKEN=tu-token
```

### 5. Correr

```bash
npm run dev      # Desarrollo (localhost:3000)
npm test         # Tests unitarios Jest
npm run lint     # ESLint
npm run build    # Build producción
```

### 6. Tests E2E

```bash
# Requiere variables de entorno:
export TEST_EMAIL="usuario@ejemplo.com"
export TEST_PASSWORD="contraseña"

# Contra producción:
npm run test:e2e

# Contra local:
E2E_URL=http://localhost:3000 npm run test:e2e

# Modo interactivo:
npm run test:e2e:ui
```

**Usuario de prueba en producción:** `test-e2e@cobrodetector.com`

Los tests E2E verifican:
- Login/logout
- Subida de archivo CSV/Excel/PDF
- Análisis completo (reglas + IA)
- Detección de anomalías
- Descuento de créditos
- Rutas protegidas
- Responsive design
- Modo oscuro

### 7. QA Check

```bash
npx ts-node scripts/qa-check.ts
```

Verifica: migraciones SQL, endpoints API, tipos de base de datos, dependencias y archivos de configuración.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/              # Login y registro
│   ├── (dashboard)/
│   │   ├── dashboard/             # Home con métricas y búsqueda
│   │   ├── analisis/              # Upload + resultados + paywall Platino
│   │   ├── historial/             # Lista con filtro (semana/mes/año) y delete
│   │   │   └── [id]/              # Detalle con anomalías, reporte, paywall
│   │   └── precios/               # Planes y compra
│   ├── api/
│   │   ├── analyze/               # POST: upload + análisis síncrono
│   │   ├── analyses/[id]/         # DELETE: eliminar análisis
│   │   ├── companies/             # CRUD multi-empresa
│   │   ├── documents/             # Cartas reclamo (DOCX/PDF)
│   │   ├── payments/
│   │   │   ├── create/            # Crear preferencia MP
│   │   │   ├── webhook/           # Recibir notificaciones MP
│   │   │   └── unlock-report/     # Pago 20% para desbloquear reporte
│   │   └── v1/analyses/[id]/      # API pública (API key auth)
│   └── page.tsx                   # Landing page
├── components/
│   └── anomaly-card.tsx           # Tarjeta de anomalía
├── lib/
│   ├── analyzer.ts                # Motor de detección (reglas + IA)
│   ├── parser.ts                  # Parser CSV/Excel/PDF
│   ├── plans.ts                   # Configuración de planes
│   ├── mercadopago.ts             # Cliente Mercado Pago
│   ├── api-auth.ts                # Auth API keys (SHA-256 vía RPC)
│   ├── api-error.ts               # Manejo de errores HTTP
│   ├── security.ts                # Sanitización + verificación webhook
│   ├── rate-limit.ts              # Rate limiting (Upstash Redis)
│   ├── analysis-queue.ts          # Procesamiento asíncrono de análisis
│   ├── document-generator.ts      # Generación Word/PDF
│   ├── services/
│   │   ├── credit.service.ts      # Gestión de créditos
│   │   └── company.service.ts     # Gestión multi-empresa
│   └── supabase/                  # Clientes Supabase (server/client/middleware)
└── types/
    └── database.types.ts          # Tipos TypeScript (manuales)
```

---

## Flujo de pago

### Planes fijos (Inicial, Plus, Contador)

```
/precios → BuyButton → POST /api/payments/create → MercadoPago checkout
→ webhook → acredita créditos → /analisis → subir archivo → reporte inmediato
```

### Plan Platino / Contador 20%

```
/precios → "Comenzar ahora" → /analisis?plan=platino → subir archivo
→ análisis corre sin consumir crédito → status: awaiting_payment
→ paywall: "Pagá $XX.XXX (20%) para desbloquear"
→ POST /api/payments/unlock-report → MercadoPago checkout
→ webhook (unlock_{analysisId}) → status: completed → reporte liberado
```

---

## API v1

API REST para integración con sistemas contables. Autenticación por API key.

**Header:** `Authorization: Bearer cd_xxx...`

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/analyses/:id` | Obtener resultado de análisis |
| GET | `/api/companies` | Listar empresas |
| POST | `/api/companies` | Crear empresa |
| GET | `/api/companies/:id` | Ver empresa |
| PATCH | `/api/companies/:id` | Actualizar empresa |
| DELETE | `/api/companies/:id` | Desactivar empresa |
| POST | `/api/analyze` | Subir estado de cuenta (multipart: `file`, `company_id`) |
| POST | `/api/documents/complaint-letter` | Carta reclamo Word (`{ analysisId }`) |
| POST | `/api/documents/complaint-letter/pdf` | Carta reclamo PDF (`{ analysisId }`) |

### Ejemplo

```bash
curl -X POST https://cobrodetector.cl/api/analyze \
  -H "Authorization: Bearer cd_xxx..." \
  -F "file=@estado_cuenta.pdf" \
  -F "company_id=uuid-de-empresa"
```

---

## CSV con anomalías pre-etiquetadas

Columnas reconocidas por el parser:

| Columna | Descripción |
|---------|-------------|
| `id_transaccion` | ID único de la transacción |
| `fecha` / `date` | Fecha del cargo |
| `desc` / `glosa` / `concepto` | Descripción |
| `monto` / `importe` / `amount` | Monto en CLP |
| `tipo_anomalia` | `COBRO_DOBLE`, `COBRO_ALTO_DUPLICADO`, `COBRO_INCORRECTO` |
| `id_transaccion_referencia` | ID del par duplicado |
| `reclamable` | SI/NO |
| `motivo_reclamo` | Descripción del error |

---

## Configuración Mercado Pago

1. Obtené credenciales en [mercadopago.cl/developers](https://www.mercadopago.cl/developers/panel/credentials)
2. Variables: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`
3. Webhook URL: `https://tu-dominio.vercel.app/api/payments/webhook`

---

## Bancos compatibles

Santander · BCI · Banco de Chile · BancoEstado · Itaú · Scotiabank · Banco Security · Banco Falabella · Banco Ripley

---

## Contacto

soporte@cobro-detector.cl

## Licencia

MIT
