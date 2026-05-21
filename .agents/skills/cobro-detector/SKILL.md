# CobroDetector - Project Skill

## Descripción
CobroDetector es una aplicación Next.js 14 que detecta cobros bancarios incorrectos (comisiones duplicadas, cargos no reconocidos, errores en cuotas sin interés) para negocios chilenos. Usa reglas determinísticas + Google Gemini AI.

## Stack
- **Frontend:** Next.js 14 App Router, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (auth, DB, storage)
- **AI:** Groq (Llama 3.1 70B) — reemplazó a Google Gemini (cuota gratuita agotada)
- **Pagos:** Mercado Pago
- **Rate Limiting:** Upstash Redis
- **Documentos:** docx (Word), pdf-lib (PDF)
- **Testing:** Jest (unit), Playwright (E2E)

---

## Arquitectura de Anomalías

### Pipeline de detección (`src/lib/analyzer.ts:analyzeFile`)
```
CSV/Excel/PDF → Parser → detectAnomaliesRules() + detectLabeledAnomalies() + analyzeTransactionsWithAI()
                        → allAnomalies combinado → AnalysisResult
```

Tres capas de detección, en este orden:
1. **Reglas determinísticas** (`detectAnomaliesRules`) — sin AI, rápidas
2. **Anomalías pre-etiquetadas** (`detectLabeledAnomalies`) — desde CSV con columnas específicas
3. **AI** (`analyzeTransactionsWithAI`) — Google Gemini

### Tipos de anomalías

| Type | Severity | Label UI | Origen |
|------|----------|----------|--------|
| `duplicate_commission` | high | Comisión duplicada | Reglas + CSV + AI |
| `installment_error` | - | Error en cuotas | AI |
| `unknown_charge` | low | Cargo no reconocido | Reglas + AI |
| `incorrect_charge` | medium | Cobro incorrecto | CSV (`COBRO_INCORRECTO`) |

### Estructura DetectedAnomaly (`src/types/database.types.ts`)
```typescript
interface DetectedAnomaly {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  detail?: string
  recoverableAmount: number  // en CLP
  transactionRefs: string[]   // IDs de transacciones involucradas
}
```

---

## Reglas Determinísticas (`detectAnomaliesRules`)

### Regla 1a: Comisión de crédito duplicada en ventas a cuotas (Santander)
- Detecta patrón: "VENTA TC X CUOTAS" + comisiones con palabras clave del comercio
- Keywords comisión: `comision credito`, `com credito`, `comision tc`, `comisión crédito`, `com. credito`, `comissao credito`
- Extrae merchant words de la venta (ej: "RIPLEY" de "VENTA TC RIPLEY")
- Filtra comisiones del mismo mes que compartan merchant words
- Verifica mismo monto (tolerancia $100)

### Regla 1b: Comisión duplicada por grupo mes-monto (fallback)
- Agrupa comisiones por `{año-mes}-{monto-redondeado-a-100}`
- Si un grupo tiene 2+ entries, son duplicadas
- Deduplica contra Regla 1a

### Regla 2: Montos idénticos en ventana de 7 días
- Transacciones negativas con mismo monto absoluto
- Matching: primeros 8 caracteres de descripción
- Ventana: 7 días

### Regla 3: Cargos genéricos/no identificados
- Descripción matchea: `com `, `cargo `, `serv `, `fee `, `cob `, `adm `
- O descripción < 6 caracteres
- Monto > $1.000 (débito)

---

## CSV con Anomalías Pre-Etiquetadas

### Formato soportado
```
id_transaccion,fecha,descripcion,categoria,monto,tipo_anomalia,id_transaccion_referencia,reclamable,motivo_reclamo
T001,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T002,SI,Cobro duplicado
T002,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T001,SI,Cobro duplicado
T009,15/03/2024,COMISION MENSUAL,Comisiones,-15000,COBRO_INCORRECTO,,SI,Motivo del reclamo
```

### Columnas reconocidas
| Columna | Campo en código | Descripción |
|---------|----------------|-------------|
| `id_transaccion` | (se usa para resolver referencias) | ID único en el CSV |
| `fecha` / `date` | `date` | Fecha del cargo |
| `desc` / `glosa` / `concepto` / `detalle` | `description` | Descripción del comercio |
| `monto` / `importe` / `amount` / `valor` | `amount` | Monto en CLP |
| `tipo` / `type` / `mov` | `type` | credit/debit |
| `tipo_anomalia` / `anomalia` | `tipoAnomalia` | COBRO_DOBLE, COBRO_ALTO_DUPLICADO, COBRO_INCORRECTO |
| `id_transaccion_referencia` / `referencia` | `idTransaccionReferencia` | Apunta al par duplicado |
| `reclamable` | `reclamable` | SI/NO |
| `motivo_reclamo` / `motivo` | `motivoReclamo` | Descripción del error |

### Mapeo de tipos
| CSV | Interno | Severidad | Comportamiento |
|-----|---------|-----------|----------------|
| `COBRO_DOBLE` | `duplicate_commission` | high | Busca par por referencia; recuperable = monto de la copia |
| `COBRO_ALTO_DUPLICADO` | `duplicate_commission` | high | Igual que COBRO_DOBLE |
| `COBRO_INCORRECTO` | `incorrect_charge` | medium | Individual; recuperable = monto total |

### Cómo funciona el parser (`src/lib/parser.ts`)
1. Detecta si es CSV puro (magic bytes: ZIP=PK, OLE2=D0CF)
2. Lee header row para identificar columnas por keywords
3. Primera pasada: construye mapa `id_transaccion original → ID generado (tx-NNNN)`
4. Segunda pasada: parsea cada fila, resuelve `id_transaccion_referencia` al ID generado
5. Filtra filas vacías o con monto 0

---

---

## Procesamiento del Análisis

### Flujo API (`src/app/api/analyze/route.ts`)
```
POST /api/analyze (FormData: file)
  → Validación Zod (tipo, tamaño < 10MB)
  → Rate limiting (Upstash)
  → Auth (Supabase session)
  → Upload a Supabase Storage (bucket: analysis-files)
  → Crear registro analysis en BD + consumir crédito
  → **Sincrónico**: analyzeFile(url, fileType, options) [maxDuration: 120s]
  → Guardar resultados en BD (status, anomalies, transactions)
  → Insertar anomalías en tabla `anomalies`
  → Devolver resultados en response HTTP
```

**⚠️ Crítico:** El procesamiento es SÍNCRONO. Vercel serverless mata fire-and-forget. No usar `enqueueAnalysis()` para el flujo principal.

### Estructura del response exitoso
```typescript
{
  success: true,
  analysisId: string,
  totalTransactions: number,
  anomaliesCount: number,
  recoverableAmount: number,
  anomalies: DetectedAnomaly[],
  summary?: string,
  bank?: string,
}
```

### Manejo de errores
- `analyzeFile()` captura errores internos y retorna `{ success: false, error: "mensaje" }`
- El route handler propaga `result.error` al frontend como `syncError`
- El frontend muestra el error en pantalla con el mensaje real
- Fallback a `enqueueAnalysis()` async si el síncrono falla

---

## Problemas Conocidos y Debugging

### 1. Análisis no detecta anomalías
Posibles causas:
- **CSV sin BOM cleaning**: CSVs de Excel en Windows tienen BOM → `cleanText = text.replace(/^\ufeff/, '')`
- **Columnas incorrectas**: Verificar que `tipo_anomalia`, `id_transaccion_referencia`, etc. matcheen los keywords del parser
- **Referencias sin resolver**: `id_transaccion_referencia` debe apuntar a un `id_transaccion` existente en el mismo CSV

### 2. Análisis se queda "Procesando..."
- **Causa**: Fire-and-forget no funciona en Vercel serverless
- **Fix**: Hacer el análisis síncrono con `maxDuration: 120`
- **Verificar**: El route handler await-eba `analyzeFile()` directamente

### 3. Error sin mensaje específico
- `analyzeFile` devuelve `{ success: false, error: "..." }` con el mensaje real
- El frontend muestra `syncError` en pantalla
- Revisar Vercel runtime logs para más detalles

### 4. TypeScript errors con Supabase
- Errores de tipo `'never'` en `supabase.from(...)` son pre-existentes
- Causa: `database.types.ts` no está sincronizado con el schema real de Supabase
- No afectan runtime, solo TypeScript strict mode
- Se pueden ignorar para desarrollo

---

## CSV con Anomalías Pre-Etiquetadas

### Formato completo
```
id_transaccion,fecha,descripcion,categoria,monto,tipo_anomalia,id_transaccion_referencia,reclamable,motivo_reclamo
T001,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T002,SI,Cobro duplicado
T002,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T001,SI,Cobro duplicado
T009,15/03/2024,COMISION MENSUAL,Comisiones,-15000,COBRO_INCORRECTO,,SI,No corresponde según contrato
```

### Columnas reconocidas por el parser
| Columna | Keywords de matching | Campo en código |
|---------|---------------------|-----------------|
| `id_transaccion` | `id_transaccion`, `id`, `id transaccion` | (mapa de referencias) |
| `fecha` / `date` | `fecha`, `date` | `date` |
| `desc` / `glosa` / `concepto` / `detalle` | `desc`, `glosa`, `concepto`, `detalle` | `description` |
| `monto` / `importe` / `amount` / `valor` | `monto`, `importe`, `amount`, `valor` | `amount` |
| `tipo` / `type` / `mov` | `tipo`, `type`, `mov` | `type` (credit/debit) |
| `tipo_anomalia` / `anomalia` | `tipo_anomalia`, `tipo anomalia`, `anomalia` | `tipoAnomalia` |
| `id_transaccion_referencia` / `referencia` | `id_transaccion_referencia`, `id transaccion referencia`, `id_transaccion_ref`, `referencia` | `idTransaccionReferencia` |
| `reclamable` | `reclamable` | `reclamable` (boolean) |
| `motivo_reclamo` / `motivo` | `motivo_reclamo`, `motivo reclamo`, `motivo` | `motivoReclamo` |

### Mapeo tipos CSV → internos
| `tipo_anomalia` | Type interno | Severidad | Comportamiento |
|----------------|--------------|-----------|----------------|
| `COBRO_DOBLE` | `duplicate_commission` | high | Busca par por referencia; recuperable = copia |
| `COBRO_ALTO_DUPLICADO` | `duplicate_commission` | high | Igual que COBRO_DOBLE |
| `COBRO_INCORRECTO` | `incorrect_charge` | medium | Individual; recuperable = monto total |

---

## Archivos Clave

### Core
| Archivo | Propósito |
|---------|-----------|
| `src/lib/parser.ts` | Parser CSV/Excel/PDF con detección de BOM y columnas de anomalías |
| `src/lib/analyzer.ts` | Motor de detección: rules + labeled + AI |
| `src/lib/analysis-queue.ts` | Procesamiento async (fallback) |
| `src/lib/security.ts` | Sanitización, validación |
| `src/lib/utils.ts` | formatCLP, formatDate, labels |
| `src/types/database.types.ts` | ParsedTransaction, DetectedAnomaly, DB types |

### API Routes
| Ruta | Propósito |
|------|-----------|
| `/api/analyze` | Upload + análisis síncrono + guardar resultados |
| `/api/documents/complaint-letter` | Carta reclamo DOCX |
| `/api/documents/complaint-letter/pdf` | Carta reclamo PDF |
| `/api/companies` | Multi-empresa (CRUD) |
| `/api/payments/*` | Mercado Pago (create, webhook, unlock-report) |
| `/api/v1/analyses/[id]` | Public API (API key auth) |

### Frontend
| Ruta | Propósito |
|------|-----------|
| `analisis/page.tsx` | Upload + resultados + errores visibles |
| `historial/page.tsx` | Historial de análisis |
| `historial/[id]/page.tsx` | Detalle con anomalías |
| `dashboard/page.tsx` | Dashboard principal |

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Tests
npx jest --no-cache

# TypeScript check
npx tsc --noEmit

# E2E tests
npx playwright test

# Tests + Build (pre-deploy)
npx jest --no-cache && npm run build

# Deploy
git add <files> && git commit -m "tipo: descripción" && git push
```

## Variables de Entorno Requeridas
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
NEXT_PUBLIC_APP_URL=
```

## Enlaces
- **Vercel:** https://vercel.com/evigueras-projects/cobro-detector
- **Supabase:** https://supabase.com/dashboard/project/mcwqqcngfibhgluvixlu
- **GitHub:** https://github.com/eviguera/cobro-detector
- **Último deploy:** `vercel ls --format json` → buscar `target: "production"` más reciente
