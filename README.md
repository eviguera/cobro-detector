# CobroDetector

> Detecta cobros injustificados en estados de cuenta bancarios chilenos usando IA (Groq — Llama 3.1).

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

- Los créditos no vencen
- Plan Platino: subís tu archivo, detectamos los cobros, y solo pagás el 20% de lo que recuperes. El reporte se libera una vez acreditado el pago.
- Plan Contador: también podés elegir 20% de lo recuperado en vez de $100.000

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
2. Ejecutá las migraciones en SQL Editor:
   - `supabase/schema.sql`
   - `supabase/migration_payments.sql`
   - `supabase/migration_rls_and_indexes_FIXED.sql`
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

# Rate Limiting
UPSTASH_REDIS_URL=https://tu-redis.upstash.io
UPSTASH_REDIS_TOKEN=tu-token
```

### 5. Correr

```bash
npm run dev      # Desarrollo
npm test         # Tests unitarios
npm run build    # Build producción
```

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
│   │   ├── anomalies/[id]/        # PATCH: estado de anomalía
│   │   ├── companies/             # CRUD multi-empresa
│   │   ├── documents/             # Cartas reclamo (DOCX/PDF)
│   │   ├── payments/
│   │   │   ├── create/            # Crear preferencia MP
│   │   │   ├── webhook/           # Recibir notificaciones MP
│   │   │   ├── unlock-report/     # Pago 20% para desbloquear reporte
│   │   │   └── link-card/         # Vincular tarjeta
│   │   └── v1/analyses/[id]/      # API pública (API key auth)
│   └── page.tsx                   # Landing page
├── lib/
│   ├── analyzer.ts                # Motor de detección (reglas + IA)
│   ├── parser.ts                  # Parser CSV/Excel/PDF
│   ├── plans.ts                   # Configuración de planes
│   ├── mercadopago.ts             # Cliente Mercado Pago
│   ├── services/
│   │   ├── credit.service.ts      # Gestión de créditos
│   │   └── company.service.ts     # Gestión multi-empresa
│   └── supabase/                  # Clientes Supabase (server/client)
└── types/
    └── database.types.ts          # Tipos TypeScript
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

## Configuración Mercado Pago

1. Obtené credenciales en [mercadopago.cl/developers](https://www.mercadopago.cl/developers/panel/credentials)
2. Variables: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`
3. Webhook URL: `https://tu-dominio.vercel.app/api/payments/webhook`

---

## Bancos compatibles

Santander · BCI · Banco de Chile · BancoEstado · Itaú · Scotiabank · Banco Security · Banco Falabella · Banco Ripley

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

## Contacto

soporte@cobro-detector.cl

## Licencia

MIT
