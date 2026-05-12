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
