# Limpieza de Código - CobroDetector

Fecha: 3 de mayo de 2026

## Resumen
Se realizó una limpieza completa del código eliminando archivos duplicados, código no utilizado y dependencias innecesarias.

## Archivos Eliminados

### Código duplicado/no usado:
- `src/lib/supabase/server-typed.ts` - Cliente duplicado de Supabase (ya existe `server.ts` en uso)
- `src/lib/logger.ts` - Logger basado en Pino no importado en ningún archivo
- `src/lib/rate-limit.ts` - Rate limiting con Upstash no utilizado
- `src/lib/analysis-worker.ts` - Worker de análisis asíncrono no conectado

### Archivos .env duplicados eliminados:
- `.env.prod` - Duplicado de `.env.production` (contenido idéntico excepto token VERCEL_OIDC expirado)
- `.env.local.example` - Duplicado de `.env.example` (versión incompleta, faltaban variables de entorno)

**Archivos .env restantes:**
- `.env.example` - Template para variables de entorno (producción)
- `.env.local` - Variables locales (en .gitignore)
- `.env.production` - Variables para producción en Vercel
- `.env.test` - Variables para tests
- `.env.sentry-build-plugin` - Configuración Sentry

### Directorios vacíos eliminados:
- `src/app/api/webhook/` - Directorio vacío (el webhook real está en `api/payments/webhook/`)
- `src/app/sentry-example-page/` - Directorio vacío de ejemplo
- `src/app/api/sentry-example-api/` - Directorio vacío de ejemplo

## Dependencias Eliminadas

Las siguientes dependencias fueron removidas de `package.json` por no estar en uso:

| Dependencia | Razón |
|------------|-------|
| `@anthropic-ai/sdk` | No importada (se usa `@google/generative-ai`) |
| `pino` | Solo usada en `logger.ts` (eliminado) |
| `@upstash/ratelimit` | Solo usada en `rate-limit.ts` (eliminado) |
| `@upstash/redis` | Solo usada en `rate-limit.ts` (eliminado) |
| `form-data` | No importada en el proyecto |
| `pg` | No importada en el proyecto |
| `class-variance-authority` | No importada en el proyecto |
| `react-hook-form` | No importada en el proyecto |
| `@hookform/resolvers` | No importada en el proyecto |

**Total: 51 paquetes removidos**

## Verificación

Los siguientes archivos y dependencias se verificaron como EN USO y se mantienen:

### Archivos principales (confirmados):
- `src/lib/supabase/server.ts` - 22 importaciones
- `src/lib/supabase/client.ts` - 1 importación
- `src/lib/analyzer.ts` - Usa `@google/generative-ai`
- `src/lib/parser.ts` - Usa `xlsx` (importación dinámica)
- `src/lib/document-generator.ts` - Usa `docx` y `puppeteer`
- `src/lib/mercadopago.ts` - Usa `mercadopago`
- `src/lib/api-auth.ts` - Usa `zod`
- `src/lib/plans.ts` - En uso
- Todos los archivos en `src/app/api/` (excepto los eliminados)
- Todos los archivos en `src/app/(dashboard)/` y `src/app/(auth)/`

### Dependencias principales (mantenidas):
- `@google/generative-ai` - Análisis con IA
- `xlsx` - Parseo de archivos Excel
- `docx` - Generación de documentos Word
- `puppeteer` - Generación de PDFs
- `zod` - Validación de esquemas
- `mercadopago` - Integración de pagos
- `lucide-react` - Iconos
- `sonner` - Notificaciones toast
- `next-themes` - Temas claro/oscuro

## Funciones no utilizadas identificadas (pendientes)

En `src/lib/security.ts` existen funciones que no están siendo importadas:
- `verifyApiKey()`
- `hashApiKey()`
- `validateEnv()`
- `validateFullEnv()`

Estas funciones se mantienen por si se planea implementar autenticación por API key en el futuro.

## TODO pendiente en código

En `src/app/api/analyze/route.ts:74` existe un comentario:
```typescript
// TODO: Procesar análisis asíncrono
```

Esto sugiere que se planeaba usar `processAnalysisAsync` (ya eliminado). Si se necesita procesamiento asíncrono, deberá implementarse nuevamente.

## Impacto

- **Espacio ahorrado**: ~51 paquetes npm eliminados
- **Código muerto eliminado**: 4 archivos completos
- **Directorios limpiados**: 3 directorios vacíos
- **Funcionalidad**: No afectada - todos los archivos eliminados no tenían importaciones activas
