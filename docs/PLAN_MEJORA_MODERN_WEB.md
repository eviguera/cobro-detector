# Plan de mejora de código con Modern Web Guidance

> Rama: `incubadora` (sin tocar `main`).  
> Fecha: 2026-11-21.  
> Herramienta instalada: `modern-web-guidance` (Chrome/Edge/Firefox/MDN) en `.agents/skills/modern-web-guidance` + `skills-lock.json`.

## 1) Objetivo y alcance

Modernizar el código de CobroDetector a prácticas web modernas, priorizando cambios **seguros, compatibles y verificables**. El alcance cubre:

- `frontend/` (Next.js 14, App Router, Tailwind, Radix, Recharts)
- Microservicios Node/TS: `analysis-svc`, `payment-svc`, `api-svc`, `admin-svc`, `notification-svc`
- No incluye cambios de producto, migraciones BD breaking en cloud, ni merge a `main`.

## 2) Método aplicado

1. **Instalación**: `npx --yes modern-web-guidance@latest install` (proyecto, OpenCode skill).
2. **Escaneo determinista**: `npx --yes modern-web-guidance@latest legacy-scan <dir>` (provisional, ~20% del corpus; verificar Keep/Drop antes de aplicar).
3. **Guías consultadas**: `retrieve dynamic-sibling-animations js`, búsquedas `dialog popover modal`, `form validation`.
4. **Criterio de cambio**: aplicar solo cuando el patrón coincide con Keep/Drop de la guía, mantiene comportamiento, y es compatible con el runtime/TS del paquete.

## 3) Cambios ya aplicados (esta iteración)

| Área | Archivo | Guía MWG | Cambio | Riesgo |
|---|---|---|---|---|
| CSS animación | `frontend/src/app/globals.css` | `dynamic-sibling-animations` | Stagger mantiene fallback `:nth-child(1..6)` y agrega `@supports (animation-delay: calc(1s * sibling-index()))` con `calc((sibling-index() - 1) * 70ms)`. Respeta reduced-motion global existente. | Bajo; fallback preservado. |
| JS arrays | `frontend/src/components/analysis/findings-explorer.tsx` | `js/copying-array-methods` | `[...rows].sort(...)` → `rows.toSorted(...)`. | Bajo; copia inmutable igual. |
| JS arrays | `frontend/src/components/analysis/transactions-table.tsx` | `js/copying-array-methods` | `[...filtered].sort(...)` → `filtered.toSorted(...)`. | Bajo. |
| JS arrays/agrupación | `frontend/src/lib/analyzer.ts` | `js/copying-array-methods`, `js/object-groupby` | `toSorted` en 2 ordenamientos; agrupación de comisiones con `Object.groupBy` + guard `txs && ...`. | Bajo-medio; `Object.groupBy` devuelve `Partial<Record<...>>`, se agregó guard. |
| JS arrays | `analysis-svc/src/domain/anomaly-rules.ts` | `js/copying-array-methods` | 3 copias+sort → `toSorted`. | Bajo. |
| JS timeout | `analysis-svc/src/security/supabase-jwt.ts`, `payment-svc/src/security/supabase-jwt.ts`, `api-svc/src/security/supabase-jwt.ts`, `admin-svc/src/security/supabase-jwt.ts`, `notification-svc/src/security/supabase-jwt.ts` | `js/abort-signal-timeout` | `AbortController + setTimeout/clearTimeout` → `AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS)`. | Bajo; mismo timeout, menos boilerplate. |
| TS compat | `analysis-svc/tsconfig.json` | soporte de tipos para `toSorted` | Agregado `"lib": ["ES2023"]`. | Bajo; runtime Node 22 ya soporta. |

**Validación pendiente de ejecutar en este entorno:** lint/typecheck/test/build por paquete (ver sección 7).

## 4) Hallazgos del escaneo MWG (determinista, provisional)

| Directorio | Hallazgos | Guías | Estado |
|---|---:|---|---|
| `frontend` | 6 | `dynamic-sibling-animations`, `js` | Corregidos los 6 hallazgos detectados. |
| `analysis-svc/src` | 4 | `js/abort-signal-timeout`, `js/copying-array-methods` | Corregidos. |
| `payment-svc/src` | 1 | `js/abort-signal-timeout` | Corregido. |
| `api-svc/src` | 1 | `js/abort-signal-timeout` | Corregido. |
| `admin-svc/src` | 1 | `js/abort-signal-timeout` | Corregido. |
| `notification-svc/src` | 1 | `js/abort-signal-timeout` | Corregido. |

> Nota: `legacy-scan` no cubre todo el corpus. Usar como señal inicial, no como auditoría completa.

## 5) Backlog priorizado de modernización

### Ola P0 — Quick wins seguros (1-2 días)

| ID | Mejora | Guía MWG / práctica | Archivos objetivo | Criterio de aceptación |
|---|---|---|---|---|
| P0-1 | Completar sweep `AbortSignal.timeout`/`toSorted` en cualquier nuevo hallazgo | `js/*` | repo completo | `legacy-scan` sin hallazgos JS evitables; tests/typecheck verdes. |
| P0-2 | Normalizar `fetch` con timeout/cancelación donde aplique | `js/abort-signal-timeout` | clientes HTTP frontend/servicios | No quedan timers manuales para aborts simples. |
| P0-3 | Revisar agrupaciones manuales | `js/object-groupby` | frontend/src, services | Solo usar `Object.groupBy` donde tipos y legibilidad mejoran; mantener fallback si TS/lib lo exige. |
| P0-4 | Validar compatibilidad TS/libs | compat | `analysis-svc`, `payment-svc`, `frontend` | `typecheck` pasa sin ampliar libs innecesariamente. |

### Ola P1 — Semántica, accesibilidad y UX nativa (3-5 días)

| ID | Mejora | Guía MWG | Oportunidad en CobroDetector | Criterio de aceptación |
|---|---|---|---|---|
| P1-1 | Dialogs/modales nativos o alineados a patrón moderno | `dialog`, `declarative-dialog-popover-control` | Revisar modales/drawers existentes; donde convenga, usar `<dialog>`/Popover API o asegurar focus trap, Esc, inert/scroll lock correcto. | Teclado, foco, cierre, screen reader OK; sin regresión visual. |
| P1-2 | Formularios modernos y validación post-interacción | `forms`, `validate-input-after-interaction`, `accessible-error-announcement` | Login, subida/análisis, settings/pagos. | Errores visibles tras interacción; `aria-invalid`/mensajes accesibles; autocomplete correcto. |
| P1-3 | Navegación/drawer y overlays | `navigation-drawer`, `prevent-page-scroll-under-modal-dialog` | Sidebar móvil/command palette/overlays. | Sin scroll bleed; cierre por Esc/click fuera según patrón; foco restaurado. |
| P1-4 | Notificaciones no intrusivas | `persistent-toast-notifications` | Confirmar patrón de toasts (`sonner`) y anuncios ARIA. | Feedback no bloqueante; mensajes críticos anunciados. |
| P1-5 | Revisión a11y dirigida por guías | `accessibility`, `color` | Mantener 0 violaciones axe en flujos clave. | Axe/Playwright a11y verde en rutas críticas. |

### Ola P2 — CSS moderno, rendimiento y pulido visual (3-5 días)

| ID | Mejora | Guía MWG | Oportunidad | Criterio de aceptación |
|---|---|---|---|---|
| P2-1 | Tipografía y legibilidad | `typography`, `improve-text-layout-and-legibility`, `visually-stable-font-fallbacks` | Headings/editorial y cifras mono. | Sin saltos de layout visibles; line-height/medidas consistentes. |
| P2-2 | Dark mode / browser UI theming | `dark-mode`, `browser-ui-theming` | Tokens existentes y controles nativos. | `color-scheme`, controles/formularios coherentes en light/dark. |
| P2-3 | Scrollbars y preferencias de contraste | `customize-scrollbar-color-and-thickness`, `adapt-scrollbar-to-contrast-preferences` | Scrollbar global actual. | Respeta contraste/preferencias; no reduce usabilidad. |
| P2-4 | Animaciones y motion | `animate-to-from-top-layer`, `natural-interactions` | Transiciones de modales/listas/botones. | Reduced-motion respetado; animaciones solo compositor donde sea posible. |
| P2-5 | Rendimiento de rendering | `progress`, `spinner`, `visual-effects` / auditoría general | Evitar efectos costosos en listas grandes. | Sin jank perceptible en historial/detalle; métricas UX estables. |

### Ola P3 — Arquitectura web, robustez y observabilidad (continuo)

| ID | Mejora | Práctica | Criterio de aceptación |
|---|---|---|---|
| P3-1 | Cobertura de tests para modernizaciones | Jest/Playwright | Tests existentes pasan; agregar casos solo donde el cambio altere comportamiento. |
| P3-2 | Auditoría de compatibilidad de browser/runtime | Baseline/soporte real | Features modernas con fallback o soporte alineado al target. |
| P3-3 | Revisión de seguridad web | `security-and-hardening` + MWG | Headers/CSP/forms/outputs revisados; sin regresión auth/storage. |
| P3-4 | Documentar estándar MWG en PRs | Docs | Checklist en PR: scan, guías consultadas, Keep/Drop, validación. |

## 6) Candidatos a revisar manualmente (no determinista)

Estos requieren inspección guiada con `modern-web-guidance search/retrieve`:

- **Dialogs/Popovers/Toasts**: `frontend/src/components/ui/*`, overlays, command palette, menús.
- **Formularios**: login, upload, checkout, ajustes; autocomplete, inputmode, validación, errores accesibles.
- **Imágenes/media**: uso de `next/image`, `loading`, `decoding`, tamaños responsivos.
- **Navegación/scroll**: drawers, scroll lock, focus restoration, `scroll-margin` en anclas.
- **CSS moderno**: container queries, `:has()`, `text-wrap`, `color-mix/oklch` solo con fallback y propósito.
- **JS moderno**: `AbortSignal.any/timeout`, `Promise.withResolvers` si aplica, evitar patrones legacy restantes.

## 7) Plan de validación

Ejecutar en `incubadora` antes de subir/mergear:

```bash
# Frontend
cd frontend
npm run lint
npm run typecheck:ci
npm test
npm run build

# Servicios modificados
cd ../analysis-svc && npm ci && npm run build && npm test --if-present
cd ../payment-svc && npm ci && npm run build && npm test --if-present
cd ../api-svc && npm ci && npm run build && npm test --if-present
cd ../admin-svc && npm ci && npm run build && npm test --if-present
cd ../notification-svc && npm ci && npm run build && npm test --if-present

# MWG
cd ..
npx --yes modern-web-guidance@latest legacy-scan frontend
npx --yes modern-web-guidance@latest legacy-scan analysis-svc/src
npx --yes modern-web-guidance@latest legacy-scan payment-svc/src
npx --yes modern-web-guidance@latest legacy-scan api-svc/src
npx --yes modern-web-guidance@latest legacy-scan admin-svc/src
npx --yes modern-web-guidance@latest legacy-scan notification-svc/src
```

## 8) Riesgos y guardrails

- **No tocar `main`** ni aplicar cambios productivos sin autorización.
- **No asumir soporte total** de features modernas: usar `@supports`/fallback donde MWG lo indique.
- **No sobre-modernizar**: priorizar legibilidad, compatibilidad y valor de usuario.
- **Mantener seguridad**: no exponer secretos, no debilitar auth/RLS/CSP/storage.
- **BD/migraciones**: cualquier cambio de schema por migración versionada; paywall breaking en cloud solo coordinado con deploy.

## 9) Próximo paso recomendado

1. Ejecutar validación de la sección 7 en paquetes modificados.
2. Commitear en `incubadora` los cambios MWG + este plan.
3. Abrir/actualizar PR #4 con resumen de modernización y checklist.
4. Continuar con Ola P1 (dialogs/forms/a11y) en PRs pequeños y verificables.
