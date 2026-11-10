# CobroDetector — Documentación de Hardening (Nov 2026)

Este documento describe el hardening de seguridad aplicado al proyecto CobroDetector: qué se implementó, dónde vive cada pieza y qué requiere configuración adicional en producción.

## Resumen de los 8 pasos

| # | Área | Qué se implementó |
|---|------|-------------------|
| 1 | Supabase RLS | Policies `auth.uid()` en 12 tablas del dominio (`frontend/supabase/schema.sql`) |
| 2 | Storage privado | Bucket `analysis-files` privado; descargas a usuario vía signed URLs con expiración de 1 h |
| 3 | Autenticación de servicios | JWT HS256 de Supabase Auth validado en los 5 microservicios (`*/src/security/supabase-jwt.ts`) |
| 4 | Webhook MercadoPago | Verificación de firma `x-signature` (HMAC-SHA256 + `timingSafeEqual`), `x-request-id` del header y anti-replay con ventana de 5 min |
| 5 | CORS + Rate limit | CORS estricto solo con `CORS_ORIGINS` y `@fastify/rate-limit` (100 req/min) en api-, payment-, admin- y notification-svc |
| 6 | Higiene de secretos | `.gitignore` hardened (todo `.env*` ignorado salvo `.env.example`); claves a rotar listadas abajo |
| 7 | Validación de archivos entrantes | `analysis-svc/src/security/safe-fetch.ts`: allowlist de host Supabase, límite de 25 MB, timeout de 15 s |
| 8 | SSRF y manejo de errores | `safe-fetch` con `redirect: 'error'` (evita bypass de la allowlist vía redirects) y mensajes de error sanitizados para el cliente |

## Componentes

### `*/src/security/supabase-jwt.ts` (los 5 microservicios)
Verificación de JWT de Supabase Auth sin dependencias externas (Node `crypto`):
- `verifySupabaseJwt(token, rawSecret)`: valida `exp` **obligatorio** (un token sin `exp` se rechaza), compara la firma con `crypto.timingSafeEqual`. Acepta el secret tal cual (UTF-8) o decodificado desde base64 (las dos convenciones del dashboard de Supabase).
- **Fail-closed**: ya no existe fallback al secreto de demo público de Supabase. Sin `SUPABASE_JWT_SECRET` (o `JWT_SECRET`) la verificación HS256 devuelve `null` → 401.
- **Formatos soportados**:
  - `api-svc`, `payment-svc`, `admin-svc`, `notification-svc`: solo `HS256`.
  - `analysis-svc`: `HS256` + `ES256`/`RS256` vía JWKS del proyecto (`kid` con reintento ante rotación). En modo asimétrico **no necesita** el secreto compartido.
  - ⚠️ Si el proyecto de Supabase migra a signing keys asimétricas (el CLI local ya emite `ES256`), los otros 4 servicios devolverán 401 hasta que se les porte la verificación por JWKS.
- `requireAuth`: preHandler de Fastify que exige `Authorization: Bearer <access_token>`; expone `request.authUser` (`id`, `email`, `role`) o responde 401.
- `requireSelfOr403(ownerId)`: ídem + exige que el token sea del dueño del recurso (403 en caso contrario).

### Webhook de MercadoPago (`payment-svc`)
- `src/infrastructure/adapters/mercadopago-gateway.adapter.ts` → `verifyWebhook(signature, rawBody, requestId?)`:
  - Parsea la cabecera `x-signature` (`ts=...,v1=...`).
  - Anti-replay: rechaza cualquier `ts` con más de ±5 min de diferencia (`SKEW_SECONDS = 5 * 60`).
  - Manifiesto firmado: `id:{data.id};request-id:{requestId};ts:{ts};` — el `request-id` se toma del header `x-request-id` (MP no lo manda en el body).
  - HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET` y comparación con `timingSafeEqual` (sin leaks de timing).
- `src/application/process-webhook.use-case.ts` exige firma presente antes de procesar; `src/routes/payments.ts` extrae `x-request-id` del header y lo propaga al use-case.

### Pipeline de análisis (`analysis-svc`)
- `src/security/safe-fetch.ts` → `fetchFileFromSupabase(fileUrl)`:
  - 1. Allowlist: solo URLs cuyo host sea el `SUPABASE_URL` configurado o hosts gestionados (`*.supabase.co` / `*.supabase.in`). Motivación: `file_url` se persiste en la tabla `analyses` y un atacante con visibilidad sobre esa columna podría hacer SSRF pidiendo al servidor que descargue URLs internas.
  - 2. `redirect: 'error'` para que un redirect no bypasee la allowlist.
  - 3. `AbortSignal.timeout(15_000)` (15 s máximo) y `MAX_FILE_BYTES = 25 MB` validado por `content-length` y por el buffer real.
  - 4. Mensajes de error seguros para exponer al cliente (sin detalles internos de red); los detalles quedan en el log del servicio.
- `src/routes/analyze.ts`: integra `safe-fetch` (no `fetch` directo) y mapea los errores a mensajes genéricos.
- Test de verificación adicional: `npx tsc --noEmit` limpio en `analysis-svc`.

### Frontend
- `src/lib/rate-limit.ts`: rate limit del lado cliente como capa preventiva.
- `src/infrastructure/http/client.ts` + servicios: errores genéricos al usuario; sin exponer detalles de backend.
- `src/app/(auth)/auth/callback/route.ts`: intercambio de código de sesión con manejo seguro de errores.
- `frontend/supabase/schema.sql`:
  - `ENABLE ROW LEVEL SECURITY` en 12 tablas: `profiles`, `companies`, `credits`, `orders`, `analyses`, `anomalies`, `api_keys`, `payment_methods`, `success_charges`, `company_members`, `success_plans`, `api_logs`.
  - Policies por operación (SELECT/INSERT/UPDATE/DELETE) con `auth.uid()` como dueño de la fila (ej. `profiles.* USING ((SELECT auth.uid()) = id)`).
- `.env.example` documentado, sin secretos reales (los `.env*` reales están ignorados por git).

## Variables necesarias en producción

| Variable | Dónde | Notas |
|---|---|---|
| `CORS_ORIGINS` | api-, payment-, admin-, notification-svc | Obligatoria: con la lista vacía el CORS es estricto y deniega intents externos |
| `SUPABASE_JWT_SECRET` | api-, payment-, admin-, notification-svc | **Obligatoria** (fail-closed): sin ella toda ruta autenticada responde 401. En `analysis-svc` solo es necesaria si el proyecto firma con HS256 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | SVCs + frontend | El service role debe ser server-side; nunca al cliente |
| `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` | payment-svc | El webhook verifica la firma con el secret |
| — (signed URLs) | frontend (`supabase-storage.ts`, `analysis.service.ts`) | `createSignedUrl(path, 3600)` con expiración fija de 1 h |

## Hardening de base de datos (2026-11-09)

Migración versionada: `supabase/migrations/20261109_security_hardening.sql` (idempotente).

1. **`profiles`** — la policy `profiles_update_own` no restringía columnas: cualquier usuario autenticado podía hacer `UPDATE profiles SET is_admin = true` y `admin-svc` (que lee esa columna con service role) lo tomaba como verdad. Ahora `REVOKE UPDATE` + `GRANT UPDATE (full_name, business_name, business_type, rut, phone)`. `referral_code` tampoco es escribible por el usuario.
2. **`credits`** — se revocan `INSERT/UPDATE/DELETE` para `authenticated`/`anon`: los créditos solo se mueven por funciones `SECURITY DEFINER` (`public.consume_credit`, `public.add_credits`).
3. **`handle_referral_signup`** — `WHERE referrer_id = referrer_id` era una tautología (o ambigüedad columna/variable): ahora usa una variable `v_referrer_id` explícita.
4. **`public.add_credits(uuid, integer)`** — acreditación atómica (`total = total + amount`) con `pg_advisory_xact_lock` por usuario. Sustituye el read-modify-write que perdía acreditaciones concurrentes. `EXECUTE` solo para `service_role`.
5. **`public.confirm_order_paid(...)`** — CAS de la orden a `paid` **y** acreditación de créditos en la misma transacción. Antes el use-case hacía `updateStatus('paid')` y luego `addCredits()`: si la acreditación fallaba, la orden quedaba pagada, el webhook respondía 4xx y el reintento de MercadoPago ya no acreditaba (cliente pagó y nunca recibió créditos). `EXECUTE` solo para `service_role`.
6. **`referrals`** — se elimina `UNIQUE (referral_code)` (un código debe poder usarse muchas veces) y se crea `UNIQUE (referred_user_id)`. Antes el **segundo** invitado con el mismo código rompía el signup con `23505` → GoTrue devolvía 500.

7. **`analyses`** — el cliente solo aporta metadatos de subida. Se revocan `INSERT`/`UPDATE` y se conceden columnas específicas; `status`, montos, anomalías y llaves de cifrado los escribe solo el worker (`service_role`). Nueva columna `plan` (`credits` | `platino`): el cliente declara el plan, pero **no** el estado ni los resultados.
8. **`public.get_analysis_report(uuid)`** — lectura del reporte con paywall aplicado en la base: si el análisis no está `completed` y tiene monto recuperable, devuelve `anomalies`, `raw_data` y `ai_summary` en `NULL`; nunca devuelve `encryption_key_base64`/`encryption_key_iv`. El cliente ya no puede leer esas columnas por PostgREST.
9. **`public.charge_analysis_credit(uuid, uuid)` / `public.refund_analysis_credit(uuid)`** — cobro idempotente y durable con la columna `analyses.credit_consumed_at` (reemplaza el lock en Redis y evita doble cobro en reintentos), y devolución automática cuando el análisis falla o no se pudo encolar.
10. **`internal.*`** — `REVOKE EXECUTE` para `authenticated`/`anon`; los wrappers `public.consume_credit`, `public.verify_api_key` y `public.can_access_company` pasan a `SECURITY DEFINER`. Antes un usuario podía llamar `internal.consume_credit(<otro_user_id>)` y consumir créditos ajenos.

**Orden de despliegue obligatorio.** Las migraciones están partidas para poder aplicarlas sin romper la versión desplegada:

| Orden | Archivo | Cuándo | ¿Rompe si se aplica antes del deploy? |
|---|---|---|---|
| 1 | `supabase/migrations/20261109_security_hardening.sql` | ya aplicada en local y producción (2026-11-10) | No |
| 2 | `supabase/migrations/20261110_analyses_schema_align.sql` | ya aplicada en producción | No (solo agrega columnas) |
| 3 | `supabase/migrations/20261110_analyses_paywall.sql` | **junto con el deploy** de microservicios + frontend | **Sí**: revoca INSERT/UPDATE y recorta SELECT en `analyses`; un frontend viejo que haga `insert({status})` o `select('*')` deja de funcionar |

Aplicación: `DATABASE_URL="postgresql://..." ./scripts/apply-prod-migration.sh` (o `npx supabase db push`).

⚠️ El esquema de producción va por detrás del repo: no existen `success_plans` ni `claim_tracking`, y `analyses` no tenía `storage_path`/`encryption_key_*` (se agregaron con la migración 2). Revisar antes de desplegar código que las use.

## Flujo de créditos y pagos

- El crédito se descuenta **en el servidor**, en `POST /v1/analyze` (`analysis-svc`), vía `charge_analysis_credit`: 402 sin saldo, 409 si el análisis ya se cobró, 500 si la RPC falla. El navegador ya no consume créditos. Si el encolado o el worker fallan, `refund_analysis_credit` devuelve el crédito.
- El Plan Platino se identifica por `analyses.plan = 'platino'` (no por `status`, que ya no controla el cliente). No consume crédito: el reporte queda bloqueado hasta pagar el 20% del monto recuperado.
- `/v1/unlock` calcula el monto con `analyses.recoverable_amount` leído de la base, nunca con el `recoverableAmount` del body; 404 si el análisis no existe y 403 si es de otro usuario.
- El webhook de MercadoPago solo libera el reporte (`unlock_*`) y acredita créditos cuando el pago está `approved`. La confirmación usa `confirm_order_paid` (CAS + acreditación en una transacción); si la acreditación falla, el webhook responde **5xx** (no 4xx) para que MercadoPago reintente y la orden no quede pagada sin créditos.
- `/health` reporta `down` + **503** tanto si la conexión a la base lanza excepción como si PostgREST devuelve `error` (credencial inválida, 5xx, permisos). Un chequeo blando (variable de entorno faltante) solo degrada cuando el resto está `ok`, y reporta `configured` (no `ok`) porque solo comprueba presencia, no que la credencial del proveedor sea válida.

### Claves a rotar
Si `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, o `SUPABASE_JWT_SECRET` se expusieron en este repo (historial previo, entornos locales), rotarlo desde:
- Supabase (Dashboard → API Settings / JWT secrets)
- MercadoPago (Dashboard → Tus integraciones → Credenciales)
- Setear el nuevo valor en el proveedor de secrets del entorno (Vercel, Fly, etc.) y desplegar.

## Patrón de tests

- Suites por servicio con Vitest (`api-svc` aún no tiene suite propia; el CI usa `npm test --if-present`):
  - `analysis-svc`: 85 tests · `payment-svc`: 53 · `notification-svc`: 28 · `admin-svc`: 10 · `frontend` (Jest): 41 — **Total: 217 verdes.**
- No llama al backend real ni a HTTP externo; se mockean los bordes:
  - `vi.mock('../security/supabase-jwt.js')` — mockea la verificación de token (los endpoints y estados se ejercitan sin JWT real).
  - `vi.mock('../infrastructure/adapters/mercadopago-gateway.adapter.js')` — gateway MP.
- Los mocks de `supabase-js` deben replicar la forma exacta del query que usa el handler (`.select().limit()` vs `.select().eq().single()`): si falta un método, el `catch` del health check lo convierte en un fallo silencioso.
- Toda corrección de seguridad/dinero lleva su test de regresión que **falla** con el código anterior.
  - stubs de repositorios Supabase / `supabase-client.js` (los `.from()` no consultan DB real).
- El caso de firma de webhook se verifica directamente contra el gateway con HMAC de prueba.

## E2E Smoke (`frontend/e2e/local-smoke.spec.ts`)
Flujo de extremo a extremo contra el entorno local: login, upload de un extracto bancario CSV (`frontend/e2e/fixtures/test-statement.csv`), ejecución de análisis y detalle con detección de transacciones y anomalías.

## Checklist post-rotación de secretos

1. Rotar el secret en Supabase/MercadoPago y subirlo al proveedor de secrets del entorno.
2. Desplegar los 5 SVCs y el frontend para que consuman el nuevo valor.
3. `npm run test` en los 4 servicios con suites (98/98 debe pasar).
4. `npx tsc --noEmit` en analysis-svc para pre-build.
5. Verificar el flujo E2E con un statement de prueba.
