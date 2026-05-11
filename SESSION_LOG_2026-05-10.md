# Session Log - 10 Mayo 2026

## Problema Reportado
- Usuario creó `prueba.csv` con errores deliberados (comisiones duplicadas, cobros duplicados, cargos genéricos) y la app no detectaba ninguna anomalía
- La función principal del producto (detectar cobros incorrectos) no funcionaba

## Diagnóstico

### Bug 1 (Crítico - Causa Raíz): Fechas corruptas en CSV por xlsx
- **Archivo:** `src/lib/parser.ts:67`
- xlsx con `{ raw: false }` auto-convierte fechas en CSV al formato M/D/YY
- Días 1-12 se interpretaban como mes-día-año (ej: `05/03/2024` → `5/2/24`)
- Esto rompía la agrupación por mes en TODAS las reglas de detección
- **Fix:** Nuevo `parseCSVBuffer()` que parsea CSV línea por línea sin pasar por xlsx, preservando las fechas originales. Detección por magic bytes (ZIP/OLE2) para diferenciar CSV de Excel real.

### Bug 2: commissionKeywords demasiado amplio
- **Archivo:** `src/lib/analyzer.ts:98`
- `'comision'` genérico matcheaba "COMISION AVANCE EFECTIVO" junto a comisiones de crédito
- En Regla 1a diluía el promedio de montos (3600 vs 5000), rompiendo el check de tolerancia $100
- En Regla 1b incluía la comisión legítima en el cálculo, sobrestimando el monto recuperable
- **Fix:** Keywords específicas (`comision credito`, `com credito`, `comision tc`, `comisión crédito`, `com. credito`, `comissao credito`)

### Bug 3: Regla 1a sin merchant matching
- **Archivo:** `src/lib/analyzer.ts:119-132`
- `monthCommissions` agarraba TODAS las comisiones del mes sin filtrar por comercio
- **Fix:** Extrae palabras clave del comercio desde la descripción de venta (ej: "RIPLEY" de "VENTA TC RIPLEY") y solo empareja comisiones que compartan esas palabras

### Bug 4: Regla 1b agrupaba por mes sin diferenciar montos
- **Archivo:** `src/lib/analyzer.ts:161-168`
- Agrupaba todas las comisiones del mes juntas, mezclando distintos tipos
- **Fix:** Agrupación por `{mes}-{monto}`

### Bug 5: raw_data no guardado
- **Archivo:** `src/lib/analysis-queue.ts`
- Las transacciones parseadas nunca se guardaban en la BD
- La tabla de transacciones en el frontend aparecía vacía
- **Fix:** Se agregó `raw_data: result.transactions` al update

### Bug 6: Errores silenciosos
- **Archivo:** `src/lib/analyzer.ts:315-320`, `src/lib/analysis-queue.ts:47`
- `analyzeFile` tragaba errores y retornaba resultados vacíos con status "completed"
- **Fix:** `success: false` en errores + `processAnalysis` detecta y marca status "error"

## Archivos Modificados
- `src/lib/parser.ts` — +109/-8 líneas: nuevo parseCSVBuffer(), parseCSVLine()
- `src/lib/analyzer.ts` — +55/-29 líneas: commissionKeywords, merchant matching, agrupación por monto
- `src/lib/analysis-queue.ts` — +14/-0 líneas: raw_data, detección de errores

## Resultado con prueba.csv
- **3 anomalías detectadas** (antes: 0)
  1. Comisión crédito RIPLEY duplicada (3 cobros): $7.200 recuperable
  2. SERVICIO NETFLIX duplicado: $7.990 recuperable
  3. COM MANTENCIÓN CUENTA genérica: $12.900 recuperable
- **Total recuperable: $28.090**
- COMISION AVANCE EFECTIVO correctamente NO detectada (es legítima)
- Build exitoso ✅, tests existentes pasan (7/7) ✅

## Commits Realizados
```
c300174 - fix: corregir detección de cobros en CSV - fechas corruptas por xlsx + reglas de comisión
```

## Deploy
- Push a `main` → Vercel production: **READY** ✅
- URL: https://cobro-detector.vercel.app

---

## Segunda Parte: Detección de anomalías pre-etiquetadas desde CSV

El usuario creó un CSV con columnas de anomalías (`tipo_anomalia`, `id_transaccion_referencia`, `reclamable`, `motivo_reclamo`) pero la app las ignoraba completamente.

### Causa Raíz
- **Archivo:** `src/lib/parser.ts` — El parser solo extraía `fecha`, `descripcion`, `monto` y `tipo`. Ignoraba todas las columnas extra del CSV.
- **Archivo:** `src/lib/analyzer.ts` — Solo tenía reglas determinísticas (comisiones Santander, ventana 7 días, cargos genéricos) y AI (Gemini). No existía lógica para leer anomalías ya etiquetadas.

### Cambios Realizados

#### 1. `src/types/database.types.ts` (+4 líneas)
- Se agregaron 4 campos opcionales a `ParsedTransaction`:
  - `tipoAnomalia?: string`
  - `idTransaccionReferencia?: string`
  - `reclamable?: boolean`
  - `motivoReclamo?: string`

#### 2. `src/lib/parser.ts` (+78/-7 líneas)
- `parseCSVBuffer()`: 
  - Detecta columnas `tipo_anomalia`, `id_transaccion_referencia`, `reclamable`, `motivo_reclamo`, `id_transaccion`
  - Lee `id_transaccion` para construir mapa de IDs originales → IDs generados
  - Resuelve `id_transaccion_referencia` al ID generado correspondiente
- `parseExcelFile()`: Mismo soporte para Excel (.xlsx/.xls)

#### 3. `src/lib/analyzer.ts` (+95 líneas)
- Nueva función `detectLabeledAnomalies()`:
  - Mapea tipos CSV a internos:
    - `COBRO_DOBLE` → `duplicate_commission` (high)
    - `COBRO_ALTO_DUPLICADO` → `duplicate_commission` (high)
    - `COBRO_INCORRECTO` → `incorrect_charge` (medium)
  - Agrupa pares mediante `idTransaccionReferencia`
  - Calcula montos recuperables: para pares, la copia; para incorrectos, el total
  - Usa `motivoReclamo` como título/descripción de la anomalía
- Integrada en `analyzeFile()` junto a reglas y AI

#### 4. UI - Labels
- `src/lib/utils.ts`: `incorrect_charge: 'Cobro incorrecto'`
- `src/app/(dashboard)/analisis/page.tsx`: Mismo label
- `src/app/(dashboard)/historial/[id]/page.tsx`: Texto "¿Cómo reclamar?" para `incorrect_charge`

### Archivos Modificados
- `src/types/database.types.ts` — +4 líneas
- `src/lib/parser.ts` — +78/-7 líneas
- `src/lib/analyzer.ts` — +95 líneas
- `src/lib/utils.ts` — +1 línea
- `src/app/(dashboard)/analisis/page.tsx` — +1 línea
- `src/app/(dashboard)/historial/[id]/page.tsx` — +2 líneas

### Resultado con test-anomalias.csv (15 transacciones)
- **6 anomalías detectadas:**
  1. COBRO_DOBLE RIPLEY VESTUARIO: $45.000 recuperable
  2. COBRO_DOBLE PARIS ELECTRO: $120.000 recuperable
  3. COBRO_ALTO_DUPLICADO Mercedes Servicio: $350.000 recuperable
  4. COBRO_ALTO_DUPLICADO Mercedes Repuestos: $280.000 recuperable
  5. COBRO_INCORRECTO Comisión mensual: $15.000 recuperable
  6. COBRO_INCORRECTO Interés por moratoria: $25.000 recuperable
- **Total recuperable: $835.000**
- Tests existentes pasan (7/7) ✅
- Build/TypeScript sin errores nuevos ✅

### Formato CSV Soportado
```
id_transaccion,fecha,descripcion,categoria,monto,tipo_anomalia,id_transaccion_referencia,reclamable,motivo_reclamo
T001,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T002,SI,Cobro duplicado de RIPLEY VESTUARIO
T002,01/03/2024,RIPLEY VESTUARIO,Vestuario,-45000,COBRO_DOBLE,T001,SI,Cobro duplicado de RIPLEY VESTUARIO
T009,15/03/2024,COMISION MENSUAL TARJETA,Comisiones,-15000,COBRO_INCORRECTO,,SI,Comisión mensual no corresponde
```

Los cobros duplicados van en pares donde cada registro apunta al otro con `id_transaccion_referencia`.

### Commits Realizados
```
ecfa1c8 - feat: detectar anomalías pre-etiquetadas desde CSV
1219499 - fix: procesamiento síncrono de análisis (+120s timeout) y BOM handling en CSV
2598c19 - fix: propagar error real a la UI para diagnóstico
```

### Deploy History
| Commit | Hora | Estado | URL |
|--------|------|--------|-----|
| `ecfa1c8` | 23:16 | READY | cobro-detector-9rgqql1xd |
| `1219499` | 23:50 | READY | cobro-detector-c8snvgn3x |
| `2598c19` | ~00:30 | BUILDING | cobro-detector-joh8a4r2c |

---

## Tercera Parte: Análisis se quedaba en "Procesando..."

### Causa Raíz
- Vercel serverless mata fire-and-forget: `enqueueAnalysis()` iniciaba `processAnalysis` en background pero no lo await-eba
- La función se cerraba después de enviar la respuesta, matando el procesamiento antes de completar
- `maxDuration = 30` era muy corto para 3.000 transacciones + Gemini AI

### Fix: Procesamiento síncrono (`src/app/api/analyze/route.ts`)
- Cambio de `maxDuration: 30` → `maxDuration: 120`
- `analyzeFile()` se ejecuta síncronamente dentro del route handler
- DB updates inline (status, anomalías, transacciones)
- Resultados devueltos directo en la respuesta HTTP
- Fallback async por si falla

### Fix: BOM handling (`src/lib/parser.ts`)
- CSVs de Excel con BOM (`\ufeff`) rompían matching de `id_transaccion`
- Fix: `cleanText = text.replace(/^\ufeff/, '')`

### Fix: Propagación de errores (`src/lib/analyzer.ts`, route.ts, page.tsx)
- `AnalysisResult.error?: string` — el error real viaja hasta la UI
- Frontend muestra el error en pantalla si `syncError` está presente
- Ya no se queda pegado en "Procesando..."

## Próximos Pasos Sugeridos
1. Probar subiendo CSV de 3.000 filas desde la UI
2. Si falla, leer el error que aparece en pantalla
3. Verificar anomalías detectadas en la UI
4. Probar con CSV normal (sin anomalías) para verificar que no hay falsos positivos
