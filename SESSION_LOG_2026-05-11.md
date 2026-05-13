# Sesión 2026-05-11

## Migración de Gemini a Groq
- Reemplazado `@google/generative-ai` por `groq-sdk`
- Modelo: `gemini-2.0-flash` → `llama-3.1-70b-versatile` → `llama-3.1-8b-instant`
- Motivo: cuota gratuita de Gemini agotada (429 Too Many Requests)
- Variable: `GOOGLE_GEMINI_API_KEY` → `GROQ_API_KEY`

## Historial: filtro y delete
- Filtro por fecha: Todas / Semana / Mes / Año (server-side con searchParams)
- Botón de eliminar análisis (doble clic confirmación, borra análisis + anomalías + archivo Storage)
- API: `DELETE /api/analyses/[id]`

## Reporte detallado
- Nuevo formato con tabla de transacciones por cada cobro (ID, fecha, descripción, monto, estado)
- Filas "A REVERSAR" en rojo para identificar transacciones a anular
- Instrucciones de reclamo por tipo de anomalía
- Caja CMF con plazos legales (10 días hábiles)

## Contraste UI
- `text-gray-300 dark:text-gray-600` → `text-gray-400 dark:text-gray-400` en 5 archivos
- Texto ahora visible en ambos modos

## Eliminación de "gratis"
- Landing: "Comenzar gratis" → "Comenzar ahora", "Analizar gratis ahora" → "Analizar ahora"
- Login: "Crea tu cuenta gratis" → "Crea tu cuenta", "Regístrate gratis" → "Regístrate"
- Dashboard/Historial: "Primer análisis gratis" → "Nuevo análisis"
- Precios: FAQ de devolución de token eliminada
- Landing: "Sin tarjeta de crédito · 1 análisis gratis" → "Analiza tu estado de cuenta en minutos"

## Nuevos planes
- **Inicial**: 1 análisis × $20.000
- **Plus**: 2 análisis × $15.000 c/u ($30.000 total)
- **Contador**: $100.000 (10 análisis) o 20% de lo recuperado
- **Platino**: Ilimitado, 20% de lo recuperado, sin costo fijo
- `FREE_CREDITS = 0`
- Campo `percentage` agregado a `Plan` interface

## Paywall Platino (bloqueo de reporte hasta pago)
- Flujo: `/analisis?plan=platino` → análisis sin consumir crédito → status: `awaiting_payment`
- Página de detalle muestra paywall con monto a pagar (20%)
- API: `POST /api/payments/unlock-report` → crea preferencia MercadoPago
- Webhook: detecta prefijo `unlock_` → actualiza status a `completed` → reporte liberado

## Limpieza del repo
- Eliminados 31 archivos: 3 session logs, 5 test data, 8 docs obsoletas, Logseq, scripts viejos, migrations rotas, build artifacts
- `.env.production` y `.env.test` agregados a `.gitignore`
- `PITCH_DECK.md` restaurado (por solicitud)
- README.md actualizado con toda la documentación actual

## Pendiente
- CDV / acceso bancario: el usuario va a generar la idea para aplicarla después

---

# Sesión 2026-05-12

## Bugs críticos arreglados
- `chargeSuccessFee()` roto: faltaban 2 parámetros (`payerEmail`, `paymentMethodId`) — el cobro automático Platino fallaba en runtime
- `verify_api_key` RPC: usaba bcrypt pero la app hashea con SHA-256 → nunca verificaba API keys. Reemplazado por `encode(digest(key_text, 'sha256'), 'hex')`. Migración: `migration_fix_verify_api_key.sql`

## Tipos de BD sincronizados
- `database.types.ts` reescrito completo para coincidir con las migraciones reales
- Corregidos: `companies` (name→company_name, owner_id→accountant_id, +8 campos), `api_keys` (+key_prefix, permissions, is_active, expires_at), `payment_methods` (last_four→last_four_digits, +mp_customer_id, +expires), `verify_api_key` returns
- Agregadas vistas: `orders_with_credits`, `analyses_with_company`
- Agregada tabla: `api_logs`
- 21 casts `as any` → 0 casts innecesarios. Solo quedan los necesarios por bug de `@supabase/ssr`
- Dependencias muertas eliminadas: `@google/generative-ai`, `exceljs` (−66 paquetes)
- `@supabase/ssr` 0.8.0 → 0.10.3, `@supabase/supabase-js` 2.90 → 2.105

## Seguridad
- Rate limiting en auth: endpoint `POST /api/auth/check-rate-limit` (5 intentos/min/IP). Integrado en login y register (fail-open)
- Race condition en consumo de créditos: fallback con CAS (`WHERE used = $oldValue`) + función PostgreSQL atómica con `FOR UPDATE`. Migración: `migration_consume_credit_atomic.sql`

## Refactorización
- **Wrapper DB**: `lib/supabase/db.ts` — centraliza acceso a 12 tablas + RPC. 14 casts `(supabase as any)` reemplazados por `tables(supabase)` en 4 rutas
- **AnomalyCard**: componente extraído de JSX duplicado en `analisis/page.tsx` y `historial/[id]/page.tsx`. ~70 líneas eliminadas
- **createPaymentPreference()**: helper MP extraído en `lib/mercadopago.ts`. ~40 líneas eliminadas de `payments/create` y `payments/unlock-report`
- **Constantes**: `lib/constants.ts` con `BANKS`, `SEVERITY`, `ANOMALY_TYPES`, `ANALYSIS_STATUS`, `ANALYSIS_STEPS`. Unifica 5 archivos que tenían duplicados
- **handleApiError**: estandarizado en 6 rutas que usaban catch inline. Excepciones: `payments/webhook` (debe retornar 200 siempre) y `health`

## Limpieza
- `detectBank()` duplicada eliminada de `analyzer.ts`, consolidada en `parser.ts` (+CorpBanca)
- `AnomalyStatusButton` vacío eliminado
- Sentry — credenciales removidas de `.env.example`
- `handleApiError` en `unlock-report` — reemplazado catch inline
- `searchParams` — comentada ruta de migración a Next.js 15
- Groq client lazy: se instancia solo cuando se usa (evita crash en tests sin API key)
- Tests: 7/7 pasan
- Migraciones aplicadas en Supabase: `verify_api_key` (SHA-256) y `consume_credit` (FOR UPDATE)
