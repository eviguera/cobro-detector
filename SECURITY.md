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
- `verifySupabaseJwt(token, rawSecret)`: solo acepta `alg === 'HS256'`, valida `exp`, compara la firma con `crypto.timingSafeEqual`. Acepta el secret tal cual (UTF-8) o decodificado desde base64 (las dos convenciones del dashboard de Supabase).
- `requireAuth`: preHandler de Fastify que exige `Authorization: Bearer <access_token>`; expone `request.authUser` (`id`, `email`, `role`) o responde 401.
- `requireSelfOr403(ownerId)`: ídem + exige que el token sea del dueño del recurso (403 en caso contrario).
- Env: `SUPABASE_JWT_SECRET` (o `JWT_SECRET`). En Supabase local se usa el default conocido; en producción debe setearse explícito.

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
| `SUPABASE_JWT_SECRET` | los 5 SVCs | Secret HS256 de Supabase Auth |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | SVCs + frontend | El service role debe ser server-side; nunca al cliente |
| `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` | payment-svc | El webhook verifica la firma con el secret |
| — (signed URLs) | frontend (`supabase-storage.ts`, `analysis.service.ts`) | `createSignedUrl(path, 3600)` con expiración fija de 1 h |

### Claves a rotar
Si `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, o `SUPABASE_JWT_SECRET` se expusieron en este repo (historial previo, entornos locales), rotarlo desde:
- Supabase (Dashboard → API Settings / JWT secrets)
- MercadoPago (Dashboard → Tus integraciones → Credenciales)
- Setear el nuevo valor en el proveedor de secrets del entorno (Vercel, Fly, etc.) y desplegar.

## Patrón de tests

- Suites por servicio con Vitest (api-svc no tiene script de test aún):
  - `payment-svc`: 34 tests · `analysis-svc`: 35 · `notification-svc`: 19 · `admin-svc`: 10 — **Total: 98 verdes.**
- No llama al backend real ni a HTTP externo; se mockean los bordes:
  - `vi.mock('../security/supabase-jwt.js')` — mockea la verificación de token (los endpoints y estados se ejercitan sin JWT real).
  - `vi.mock('../infrastructure/adapters/mercadopago-gateway.adapter.js')` — gateway MP.
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
