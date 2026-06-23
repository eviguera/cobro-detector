# Plan de Implementación — CobroDetector

> **CobroDetector** | v1.0 → v2.0 | Mayo 2026
>
> Roadmap priorizado de implementación. Estado actual y próximas fases.
>
> **Documentos relacionados**: [PRD](./2026-05-26-prd.md) · [TRD](./2026-05-26-trd.md) · [UI/UX](./2026-05-26-ui-ux.md) · [Flujos](./2026-05-26-flujos.md) · [Schema](./2026-05-26-backend-schema.md)

---

## Estado Actual: Completado

### Core (100%)

- [x] Next.js 14 App Router con route groups `(auth)` y `(dashboard)`
- [x] Supabase Auth (email/password, verificación, sesiones)
- [x] Supabase Storage (upload de archivos)
- [x] RLS en 12 tablas con 38 políticas
- [x] Schema consolidado (689 líneas, idempotente)
- [x] Trigger `handle_new_user()` (profile + 1 crédito)
- [x] Funciones SECURITY DEFINER en schema `internal`
- [x] Wrappers SECURITY INVOKER en schema `public`

### Motor de Detección (100%)

- [x] IA: Groq Llama 3.1 8B Instant (JSON mode, temperature 0.1, timeout 30s)
- [x] Reglas determinísticas (4 reglas)
- [x] Anomalías pre-etiquetadas (CSV)
- [x] Pipeline paralelo (`Promise.all`)
- [x] Anti prompt-injection (`sanitizeDescription`)
- [x] Timeout con `AbortController`

### Parseo de Archivos (100%)

- [x] Excel: exceljs
- [x] CSV: parser nativo
- [x] PDF: pdf-parse
- [x] Detección de banco (keyword matching, 9 bancos)
- [x] Detección de columnas
- [x] Normalización de fechas y montos
- [x] Soporte para columnas de anomalías pre-etiquetadas

### UI/UX (100%)

- [x] Landing page
- [x] Login/Registro (dos paneles)
- [x] Dashboard con métricas y gráficos
- [x] Upload drag-and-drop
- [x] Progreso de análisis (7 pasos)
- [x] Resultados con AnomalyCard.Compact
- [x] Detalle con AnomalyCard.Full
- [x] Tabla de transacciones
- [x] Historial con filtros temporales
- [x] Precios con grid de 4 planes
- [x] Paywall Plan Platino
- [x] Modo oscuro (next-themes)
- [x] Responsive (mobile sidebar drawer)
- [x] Skeleton loading states
- [x] Toast notifications (sonner)

### Pagos (100%)

- [x] Integración MercadoPago (SDK 2.0.15)
- [x] Creación de preferencias de pago
- [x] Webhook con HMAC-SHA256 + timingSafeEqual
- [x] Acreditación de créditos
- [x] Pago de desbloqueo Platino (20%)
- [x] Órdenes con tracking de estado
- [x] Páginas de éxito/fallo

### Multi-Empresa (100%)

- [x] CRUD empresas
- [x] API endpoints (GET/POST/PATCH/DELETE)
- [x] Asignación de análisis a empresas
- [x] Créditos por empresa (user_id + company_id)
- [x] 1 crédito gratis por empresa creada

### API v1 (100%)

- [x] API Keys con SHA-256 hashing
- [x] Endpoint: GET /api/v1/analyses/[id]
- [x] Autenticación Bearer token
- [x] Rate limiting por API key
- [x] Logs de uso (api_logs)

### Reportes (100%)

- [x] Generación DOCX (docx library)
- [x] Generación PDF (pdf-lib)
- [x] Sanitización XML
- [x] Datos de contacto CMF

### Seguridad (100%)

- [x] Rate limiting (Upstash Redis, graceful fallback)
- [x] CSRF protection en logout
- [x] CSP headers
- [x] Sanitización de inputs
- [x] Zod validation en todos los endpoints
- [x] Logging sin leaks

### Testing (100%)

- [x] Tests unitarios Jest (15/15)
- [x] Tests E2E Playwright (10/10)
- [x] QA Check script (45/45)
- [x] CSV de 3.000 transacciones para testing
- [x] Usuario de prueba E2E

### CI/CD (100%)

- [x] Deploy en Vercel
- [x] GitHub Actions (OpenCode en issues/PRs)
- [x] ESLint flat config (sin `any` excepto tipos DB)

---

## Roadmap Priorizado

### Fase 1: Crítico (Próximas 1-2 semanas)

Estas tareas son bloqueantes para el lanzamiento en producción.

| # | Tarea | Esfuerzo | Dependencias | Riesgo |
|---|-------|----------|--------------|--------|
| 1.1 | Configurar variables de entorno en Vercel producción | 1h | Acceso a dashboard Vercel | Medio — sin esto no funciona producción |
| | `UPSTASH_REDIS_URL` | | | |
| | `UPSTASH_REDIS_TOKEN` | | | |
| | `MERCADOPAGO_WEBHOOK_SECRET` | | | |
| 1.2 | Configurar webhook MercadoPago en panel MP | 30min | URL de producción | Bajo |
| | URL: `{APP_URL}/api/payments/webhook` | | | |
| | Probar conectividad | | | |
| 1.3 | Probar flujo de pago end-to-end | 2h | 1.1, 1.2, tarjeta prueba MP | Alto — crítico para monetización |
| | Comprar plan Plus con tarjeta de prueba | | | |
| | Verificar webhook recibe notificación | | | |
| | Verificar créditos se acreditan | | | |
| | Probar desbloqueo Platino | | | |
| | Verificar manejo de errores (pago rechazado) | | | |
| 1.4 | Activar RLS en api_logs | 30min | - | Bajo — seguridad |
| 1.5 | Health check de producción | 1h | 1.1 | Medio |
| | Verificar Supabase conectado | | | |
| | Verificar Groq API funciona | | | |
| | Verificar MercadoPago SDK funciona | | | |
| | Verificar Redis rate limiting | | | |

### Fase 2: Mejoras (Próximas 3-6 semanas)

| # | Tarea | Esfuerzo | Dependencias | Riesgo |
|---|-------|----------|--------------|--------|
| 2.1 | Procesamiento asíncrono con Vercel Queue | 3-5 días | - | Alto — cambio de arquitectura |
| | Reemplazar `analysis-queue.ts` por Vercel Queue real | | | |
| | Arquitectura: upload → encolar → procesar → webhook/notificar | | | |
| | Timeout no será problema (120s actual es límite) | | | |
| | UI: mostrar estado "En cola..." con polling | | | |
| 2.2 | Upgrade a Next.js 15 | 2-3 días | - | Medio — breaking changes |
| | Migrar `revalidatePath` / `revalidateTag` | | | |
| | Usar `use cache` y `cacheTag` nativos | | | |
| | Eliminar `react.cache()` en cliente Supabase | | | |
| | Verificar compatibilidad de dependencias | | | |
| 2.3 | Deduplicación de anomalías | 1-2 días | - | Bajo |
| | Misma anomalía detectada por reglas + IA = 1 anomalía final | | | |
| | Algoritmo de merge: mismo tipo + transacciones solapadas | | | |
| | Elegir la descripción más detallada (IA sobre regla) | | | |
| 2.4 | Panel de administración básico | 2-3 días | - | Medio |
| | Vista de usuarios, créditos, análisis | | | |
| | Búsqueda y filtros | | | |
| | Métricas globales (DAU, análisis/día, ingresos) | | | |
| 2.5 | Mejoras en UI del dashboard | 2-3 días | - | Bajo |
| | Gráfico de tendencias mensuales | | | |
| | Exportación de datos (CSV) | | | |
| | Comparativa banco vs banco | | | |

### Fase 3: Opcionales (Siguientes 2-3 meses)

| # | Tarea | Esfuerzo | Prioridad | Notas |
|---|-------|----------|-----------|-------|
| 3.1 | Sentry para monitoreo de errores | 1-2 días | Baja | Setup + integración Next.js |
| 3.2 | Más tests E2E: PDF y Excel con bancos reales | 2-3 días | Baja | Cobertura de formatos |
| 3.3 | Mejora generación PDF (diseño profesional) | 2-3 días | Baja | Header, footer, tabla formateada |
| 3.4 | Notificaciones por email | 3-4 días | Baja | Supabase Edge Function + Resend/SendGrid |
| | Resultado de análisis listo | | | |
| | Créditos bajos | | | |
| | Recordatorio de análisis pendiente | | | |
| 3.5 | Dashboard de analytics para usuarios | 3-5 días | Baja | Métricas históricas, tendencias |
| 3.6 | Onboarding guiado | 2-3 días | Baja | Tooltips interactivos en primer uso |
| 3.7 | Blog / sección de recursos | 3-4 días | Baja | SEO, contenido educativo |
| 3.8 | Integración con más bancos | 1 día/banco | Baja | Ampliar cobertura |
| 3.9 | Automatización de generación de tipos TS | 1-2 días | Baja | Script que lee schema.sql → database.types.ts |

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **MercadoPago falla en producción** | Media | Alto | Probar E2E antes de lanzar. Tener plan B (pago manual). |
| **Groq API downtime** | Baja | Medio | Fallback a solo reglas determinísticas (ya implementado). |
| **Supabase outage** | Baja | Alto | Monitoreo. Status page de Supabase. |
| **Rate limiting bloquea usuarios legítimos** | Baja | Medio | Ajustar thresholds. Whitelist de IPs conocidas. |
| **CSV malformado rompe el parser** | Media | Medio | Ya hay tests. Agregar fuzzing con CSVs reales. |
| **Costo de Groq se dispara** | Baja | Medio | Timeout 30s. Rate limiting. Cache de resultados. |
| **Migración Next.js 15 rompe algo** | Media | Alto | Branch separada. Tests E2E antes de merge. |
| **Vercel Queue no soportado en plan actual** | Media | Medio | Verificar plan antes de implementar. |

---

## Métricas de Progreso

| Fase | Criterio de Finalización | Indicador |
|------|-------------------------|-----------|
| **Fase 1** | Pago end-to-end funciona en producción | 1 compra exitosa con tarjeta de prueba |
| **Fase 2.1** | Análisis asíncrono funcionando | Archivos >60s procesados sin timeout |
| **Fase 2.2** | Next.js 15 en producción | Build exitoso + tests E2E pasan |
| **Fase 2.3** | Deduplicación activa | 0 anomalías duplicadas en análisis de prueba |
| **Fase 3** | Cada feature es independiente | Feature flag o deploy separado |

---

## Historial de Releases

| Versión | Fecha | Cambios |
|---------|-------|---------|
| **v0.1** | 2026-Q1 | MVP: Auth, upload, análisis IA, resultados básicos |
| **v0.2** | 2026-Q1 | Pagos MercadoPago, planes, créditos |
| **v0.3** | 2026-Q1 | Multi-empresa, API v1, historial, reportes |
| **v0.4** | 2026-04 | Rate limiting, seguridad, tests E2E |
| **v1.0** | 2026-05 | **Versión actual**. Landing page, UI completa, QA, todos los bugs críticos corregidos |
| **v1.1** | Próximo | Fase 1: Configuración producción + pagos E2E |
| **v1.2** | Próximo | Fase 2: Async Queue + Next.js 15 + deduplicación |
| **v2.0** | Futuro | Fase 3: Dashboard avanzado, notificaciones, analytics |

---

## Convenciones para el Desarrollo

- **Ramas**: `feature/<nombre>` desde `main`. PR con descripción.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Tests**: TDD para nuevas funcionalidades. No merge sin tests.
- **Linting**: `npm run lint` debe pasar. ESLint forbids `any`.
- **Tipos**: Actualizar `src/types/database.types.ts` si se modifican tablas.
- **Schema SQL**: Actualizar `supabase/schema.sql` con cada cambio DDL.
- **Deploy**: Vercel auto-deploy en `main`. Preview deployments en PRs.
