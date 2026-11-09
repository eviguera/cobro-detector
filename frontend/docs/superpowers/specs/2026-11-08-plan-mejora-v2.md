# Plan de Mejora v2 — CobroDetector

> **Fecha:** 2026-11-08
> **Estado:** propuesta para aprobación
> **Base:** rediseño v2 + motor de análisis con evidencia ya implementados y verificados.
> **Documentos relacionados:** [PRD](./2026-05-26-prd.md) · [TRD](./2026-05-26-trd.md) · [UI/UX](./2026-05-26-ui-ux.md) · [Backend](./2026-05-26-backend-schema.md)

---

## 1. Resumen ejecutivo

La app ya no tiene un problema de “falta de diseño”: tiene un problema de **confianza, precisión y conversión**.

El rediseño v2 dejó una base sólida (0 violaciones axe, flujo E2E real, motor con confianza/evidencia). El siguiente salto no es agregar más pantallas, sino demostrar que el análisis es **correcto, explicable y accionable**, y que el usuario puede pasar de “subí una cartola” a “recuperé mi dinero” sin fricción.

**Tesis del plan:** cada peso invertido debe mover una de estas tres métricas:

1. **Precisión percibida y real** del análisis.
2. **Activación**: primer análisis completado en menos de 24 h.
3. **Conversión a reclamo**: reporte descargado y presentado.

---

## 2. Línea base (lo que ya está hecho)

| Área | Estado | Evidencia |
|---|---|---|
| Design system “ledger” | ✅ | Tokens semánticos, tipografía corregida, superficies consistentes |
| Landing / login / panel / análisis / historial / detalle / precios / métricas | ✅ | Rediseñados y verificados visualmente |
| Accesibilidad | ✅ | axe WCAG 2.2 AA: 0 violaciones en 8 rutas |
| Motor de análisis | ✅ v1 | Comisiones repetidas, cobros duplicados, intereses en cuotas, cargos genéricos, etiquetas CSV |
| Explicabilidad | ✅ | `confidence`, `evidence`, `recommendedAction` por hallazgo |
| Deduplicación | ✅ | Anti doble conteo por transacción |
| Resiliencia IA | ✅ | Si Groq falla, sigue con reglas + resumen determinístico |
| E2E real | ✅ | 10 movimientos → 4 hallazgos → $113.500 |
| Tests | ✅ | 37 Jest + 65 Vitest |
| Deploy / commit | 🔲 | **Pendiente**: cambios sin commitear |

### Ejecutado después de escribir el plan

- ✅ Benchmark del motor: `npm run benchmark` con 6 casos (Santander, BCI, Chile, Estado, Falabella, Ripley). Baseline: precision/recall/F1 100%, confianza ≥75 con 100% de acierto.
- ✅ Feedback “No corresponde” en cada hallazgo (`anomaly_feedback` + RLS + UI).
- ✅ Telemetría de embudo (`product_events`): `analysis_started`, `analysis_completed`, `analysis_failed`, `report_downloaded`, `claim_status_changed`.
- ✅ Seguimiento de reclamo (`claim_tracking`): carta lista → enviada → respuesta → CMF, con notas y alerta a 10 días hábiles.
- ✅ Health check con Supabase + Redis; Groq pasa a “not_configured” porque es opcional.
- ✅ Precisión: comercios cortos (UBER/SHELL) ya no se marcan como cargos genéricos; archivos sin movimientos fallan con mensaje claro en vez de mostrar “0 hallazgos”.
- ✅ Verificación: 65 Vitest + 37 Jest, build frontend/backend, axe 0 en 7 rutas, E2E local-smoke + analysis-async verdes.
- ✅ Fase 1 (parcial): página `/seguridad`, checklist de activación en el panel, cartola de ejemplo descargable y calculadora del Plan Platino.
- ✅ Deploy: se corrigió el Root Directory del proyecto Vercel `cobro-detector` a `frontend` (estaba en `.` y el build fallaba en 0 ms).
- ✅ Fase 3 (parcial): selección de hallazgos para la carta, descarga filtrada, evidencia en PDF/DOCX y recordatorio `.ics` a 10 días hábiles.

### Deuda crítica visible

- `GROQ_API_KEY` vacía en local → health `degraded`; la IA no corre.
- No hay benchmark etiquetado por banco → no se puede afirmar precisión real.
- No existe feedback del usuario (“este cobro no corresponde”) → el motor no aprende.
- No hay seguimiento del reclamo (enviado / respondido / escalado CMF).
- Tests E2E secundarios (payment/flow) pueden estar desactualizados.
- Bundle de detalle ~429 kB por recharts; falta lazy loading.
- Sin observabilidad de producto (eventos de activación, descarga, abandono).

---

## 3. Norte: métricas objetivo (90 días)

| Métrica | Hoy | Objetivo | Cómo se mide |
|---|---|---|---|
| Tiempo hasta primer insight (p75) | ~1 min | **< 3 min** | `analysis_started` → `analysis_completed` |
| Activación (primer análisis en 24 h) | sin medir | **> 40%** | evento `analysis_completed` / signup |
| Precisión (precision) en set etiquetado | sin medir | **> 90%** | benchmark por banco |
| Falsos positivos reportados | sin medir | **< 10%** | feedback “no corresponde” |
| Descarga de reporte con hallazgos | sin medir | **> 60%** | evento `report_downloaded` |
| Conversión free → pago | sin medir | **> 5%** | orders / signups |
| Errores de análisis | ~0 local | **< 1%** | Sentry + status `error` |
| Accesibilidad | 0 axe | **0 serious/critical** | CI axe |
| LCP panel/detalle | sin medir | **< 2.5 s** | Vercel Speed Insights |

---

## 4. Pilares y fases

### Fase 0 — Estabilizar y publicar (Semana 1) · P0

**Objetivo:** que lo ya construido esté versionado, desplegado y observable.

| # | Tarea | Criterio de aceptación | Agente/skill | Scope |
|---|---|---|---|---|
| 0.1 | Commit y PR del rediseño + motor | `git status` limpio; PR con resumen y screenshots | `git-workflow-master`, `code-reviewer` | S |
| 0.2 | Checklist de entorno producción | Vercel + microservicios con `SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `REDIS_URL`, CORS | `devops-automator` | S |
| 0.3 | Health checks reales | `/health` verde con Groq y Redis; alerta si degrada | `sre-site-reliability-engineer` | S |
| 0.4 | Observabilidad mínima | Sentry frontend/backend + eventos `analysis_started/completed/failed`, `report_downloaded` | `analytics-reporter` | M |
| 0.5 | Verificación post-deploy | `local-smoke` y `analysis-async` verdes contra staging | `test-engineer` | S |

**Checkpoint C0:** build OK, tests OK, axe 0, E2E crítico verde, deploy accesible.

---

### Fase 1 — Confianza y activación (Semanas 2–3) · P0

**Objetivo:** reducir la duda antes de subir una cartola y aumentar el primer análisis completado.

| # | Tarea | Criterio de aceptación | Agente/skill | Scope |
|---|---|---|---|---|
| 1.1 | Página `/seguridad` | Explica cifrado, retención, borrado, subprocesadores y contacto; enlazada desde landing/análisis | `technical-writer`, `security-auditor` | M |
| 1.2 | Checklist de activación en panel | “Sube tu cartola → revisa hallazgos → descarga carta”, persistente y con progreso real | `ux-researcher`, `frontend-developer` | M |
| 1.3 | Cartola de ejemplo descargable | Usuario sin archivo puede probar el flujo con un CSV realista | `frontend-developer` | S |
| 1.4 | Errores de subida persistentes y accionables | Formato, tamaño y magic bytes junto al drop zone, con `aria-describedby` | `frontend-developer` | S |
| 1.5 | Calculadora Plan Platino | “Si recuperas $X, pagas $Y, te quedan $Z” en precios y paywall | `pricing-analyst`, `frontend-developer` | M |
| 1.6 | Comparativa de planes en móvil | Tabla o tarjetas comparables sin scroll de 4 pantallas | `ui-designer` | M |
| 1.7 | Sticky CTA en detalle móvil | Monto + “Descargar carta” siempre visible | `frontend-developer` | S |
| 1.8 | Microcopy de confianza unificado | Un solo mensaje de privacidad por pantalla; sin promesas sin fuente | `technical-writer` | S |
| 1.9 | Revisión de testimonios/cifras | “$500K+”, “97%” verificados o retirados | `brand-guardian` | S |

**Checkpoint C1:** embudo instrumentado; usuario nuevo completa análisis sin ayuda; axe 0.

---

### Fase 2 — Precisión de clase mundial (Semanas 3–6) · P0

**Objetivo:** que el análisis sea defendible frente a un banco y medible frente a un benchmark.

| # | Tarea | Criterio de aceptación | Agente/skill | Scope |
|---|---|---|---|---|
| 2.1 | Dataset benchmark etiquetado | ≥ 3 cartolas por banco (Santander, BCI, Chile, Estado, Falabella, Ripley), con anomalías esperadas | `data-engineer`, `test-engineer` | L→ dividir |
| 2.2 | Harness precision/recall | Script `analysis-svc/scripts/benchmark.ts` que reporta TP/FP/FN, precision, recall, F1 por banco | `ai-engineer` | M |
| 2.3 | Calibración de confianza | Confianza empírica vs. real (Brier score o buckets); ajustar umbrales | `statistician`, `ai-engineer` | M |
| 2.4 | Feedback “no corresponde” | Botón en cada hallazgo; guarda `anomaly_feedback` (motivo, usuario, tipo) | `backend-architect`, `database-optimizer` | M |
| 2.5 | Reglas específicas por banco | Parsers/normalizadores por banco; comisiones y cuotas con nombres reales | `backend-architect` | L→ dividir |
| 2.6 | Detección de suscripciones legítimas | Evitar falsos positivos de cargos recurrentes (Spotify, seguros, mantención) | `ai-engineer` | M |
| 2.7 | Segunda opinión IA acotada | La IA solo propone; el motor valida contra transacciones y descarta sin refs | `ai-engineer` | M |
| 2.8 | Reporte de calidad del análisis | “Por qué este hallazgo es válido” + nivel de evidencia visible | `technical-writer` | S |

**Checkpoint C2:** precision ≥ 90% en benchmark; falsos positivos < 10%; confianza calibrada.

---

### Fase 3 — Del hallazgo al dinero (Semanas 6–9) · P1

**Objetivo:** que el usuario no solo vea el problema, sino que ejecute el reclamo.

| # | Tarea | Criterio de aceptación | Agente/skill | Scope |
|---|---|---|---|---|
| 3.1 | Selección de hallazgos para la carta | Incluir/excluir hallazgos antes de exportar | `frontend-developer` | M |
| 3.2 | Carta v2 con anexo de evidencia | PDF/DOCX con transacciones, fechas, montos y fundamento | `document-generator`, `legal-document-review` | M |
| 3.3 | Seguimiento de reclamo | Estados `borrador → enviado → respondido → escalado CMF`, con fecha y notas | `product-manager`, `backend-architect` | L→ dividir |
| 3.4 | Recordatorios | Email/push a los 10 días hábiles si no hay respuesta | `notification-svc` + `email-marketing-strategist` | M |
| 3.5 | Plantillas por banco | Instrucciones y canales específicos (sucursal, web, ejecutivo) | `technical-writer` | S |
| 3.6 | Métricas de recuperación | “Recuperado real” reportado por usuario, separado de “estimado” | `analytics-reporter` | M |

**Checkpoint C3:** usuario puede descargar carta, marcarla enviada y recibir recordatorio.

---

### Fase 4 — Escala, calidad y crecimiento (Semanas 9–12) · P1/P2

| # | Tarea | Criterio de aceptación | Agente/skill | Scope |
|---|---|---|---|---|
| 4.1 | Upgrade Next.js 15 | Build, tests y E2E verdes; sin regresiones de CSP | `frontend-developer` | M |
| 4.2 | Performance del detalle | Recharts lazy; LCP < 2.5 s; bundle inicial reducido | `performance-benchmarker` | M |
| 4.3 | Accesibilidad en CI | axe como gate en PR para rutas clave | `accessibility-auditor` | S |
| 4.4 | E2E completo actualizado | payment, flow y webhooks verdes con el nuevo copy | `test-automation-engineer` | M |
| 4.5 | Seguridad nivel banco v2 | Revisión de uploads, JWT, RLS, SSRF y secretos | `security-auditor` | M |
| 4.6 | Multi-empresa y API v1 | Casos de uso contador y API documentada | `backend-architect` | L→ dividir |
| 4.7 | Retención y referidos | Email de reanálisis trimestral + programa de referidos medido | `email-marketing-strategist`, `growth-hacker` | M |
| 4.8 | Panel admin | Uso, errores, hallazgos por banco y feedback | `admin-svc` + `analytics-reporter` | M |

**Checkpoint C4:** release candidate con métricas de producto y calidad en verde.

---

## 5. Orquestación de agentes

| Workstream | Agente líder | Agentes de apoyo | Skill |
|---|---|---|---|
| Producto y priorización | `product-manager` | `ux-researcher`, `analytics-reporter` | `cobro-detector` |
| Diseño y frontend | `ui-designer` | `frontend-developer`, `accessibility-auditor` | `frontend-design`, `accessibility` |
| Motor de análisis | `backend-architect` | `ai-engineer`, `statistician`, `data-engineer` | `cobro-detector-db` |
| Calidad y release | `test-engineer` | `code-reviewer`, `test-automation-engineer` | `test-driven-development` |
| Seguridad y confianza | `security-auditor` | `secrets-credential-hygiene-engineer` | `security-and-hardening` |
| Operación y métricas | `sre-site-reliability-engineer` | `analytics-reporter`, `devops-automator` | `harness-engineering` |
| Contenido y confianza | `technical-writer` | `brand-guardian`, `legal-document-review` | — |

**Regla de orquestación:** un solo agente escribe por archivo a la vez. Los workstreams paralelos solo tocan territorios disjuntos (ej. `analysis-svc/**` vs `frontend/src/components/analysis/**`). Contratos de API y tipos se congelan antes de paralelizar.

---

## 6. Sprints de 7 días (arranque)

### Día 1 — Publicar la base
- Commit + PR del rediseño y motor.
- Configurar `GROQ_API_KEY`, `SUPABASE_ANON_KEY`, Redis y CORS.
- Ejecutar build, Jest, Vitest, axe y E2E crítico.

### Día 2 — Medir el motor
- Crear 6 cartolas etiquetadas (1 por banco).
- Implementar `benchmark.ts` con precision/recall/F1.
- Reporte inicial de falsos positivos.

### Día 3 — Afinar precisión
- Ajustar reglas de comisiones/cuotas con el benchmark.
- Calibrar confianza por tipo de hallazgo.
- Tests de regresión por banco.

### Día 4 — Feedback del usuario
- Tabla `anomaly_feedback` + RLS.
- Botón “No corresponde” en `FindingsExplorer`.
- Panel interno de feedback.

### Día 5 — Confianza y activación
- `/seguridad` + cartola de ejemplo.
- Checklist de activación en panel.
- Calculadora Platino.

### Día 6 — Del hallazgo al reclamo
- Selección de hallazgos para la carta.
- Sticky CTA móvil.
- Ajustes de reporte PDF/DOCX.

### Día 7 — QA y retro
- E2E completo, axe, performance.
- Deploy staging + revisión con usuario.
- Retro y ajuste del siguiente sprint.

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Motor con falsos positivos en bancos no vistos | Alto | Benchmark por banco + feedback + confianza visible |
| Fuga de datos de cartolas | Crítico | AES-GCM correcto, borrado, RLS, revisión de seguridad |
| Dependencia de Groq | Medio | Reglas determinísticas como camino principal; IA opcional |
| Complejidad del seguimiento de reclamos | Medio | Empezar con estados simples y notas, no un CRM |
| Deuda de tests E2E | Medio | Gate en CI + actualización por release |
| Promesas de marketing sin sustento | Medio | Verificar o retirar cifras; página de seguridad |

---

## 8. Definición de “listo” (v2)

- [ ] 0 violaciones axe serious/critical en rutas clave.
- [ ] Precision ≥ 90% y falsos positivos < 10% en benchmark.
- [ ] Un usuario nuevo completa análisis y descarga carta sin ayuda.
- [ ] Cada hallazgo tiene evidencia, confianza y acción.
- [ ] El reclamo se puede marcar como enviado y recordar a 10 días.
- [ ] Sentry + métricas de embudo activas.
- [ ] Build, tests y E2E verdes en CI.
- [ ] Documentación de producto, seguridad y API actualizada.

---

## 9. Decisión pendiente

El plan asume que el foco de los próximos 90 días es **precisión + confianza + conversión**, no nuevas features de crecimiento. Si el objetivo es levantar capital o escalar usuarios, se prioriza Fase 1 y 4; si el objetivo es que el producto sea defendible ante bancos, se prioriza Fase 2 y 3.
