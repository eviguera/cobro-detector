# Estrategia para que CobroDetector destaque en una incubadora

> Documento generado en rama `incubadora` a partir del análisis de producto/BD, investigación y aportes de subagentes (product-manager). Sin tocar `main`. Validar deadlines/terms de cada programa en su sitio oficial antes de aplicar.

## 1) Correcciones aplicadas y batería activada

### Cambios ya aplicados en repo (UI)
- **Caso Rodrigo (carnicería, Rancagua) actualizado a “más de 1.000 pagos”** (reemplaza “300”):
  - `frontend/src/app/page.tsx` — testimonio/landing: “revisando más de 1.000 pagos”.
  - `frontend/src/app/(auth)/login/page.tsx` — testimonio en login: “revisando más de 1.000 pagos”.
- *Operativo:* cambios en rama `incubadora` para pruebas; merge a rama principal solo con autorización previa tras validar resultados.

### Batería activada
| Capa | Activado / usado | Para qué |
|---|---|---|
| **Skills** | `brainstorming`, `cobro-detector-db`, `supabase-postgres-best-practices`, `security-and-hardening` | Ideación/estrategia, criterio de esquema/RLS/RPCs, buenas prácticas Postgres, hardening |
| **Agentes / subagentes** | `product-manager` (**completado**, plan 30-60-90/métricas/demo/experimentos/backlog); `business-strategist` (**falló**: “Provider blocked the response”, `ses_e04aec450ffeznOKXLoLmuLn7m`) → huecos de estrategia de negocio sintetizados en este documento | Producto/crecimiento + estrategia/posicionamiento |
| **Recomendados para siguientes ciclos** | `/review` (`code-reviewer`), `/audit` (`security-auditor`), `/test` (`test-engineer`); subagentes `database-optimizer`/`database-reliability-engineer` (índices/EXPLAIN/retención), `deal-strategist` o `proposal-strategist` (aplicaciones/pitch) | Calidad, seguridad, performance BD y narrativa de aplicación |
| **Herramientas / investigación** | `read`/`websearch`/`webfetch` (PRD, TRD, pitch, specs, plan v2/roadmap, programas y recursos), `engram.mem_search` + `mem_context` (sin hallazgos previos relevantes), análisis de estado repo/BD | Evidencia, contexto y priorización |
| **Pendiente de activar en ejecución** | `verification-before-completion`, instrumentación analítica, Sentry/observabilidad, pipeline de aplicación con checklist por incubadora | Cerrar brecha “demo bonita” → “evidencia creíble” |

### Estado real vs. a validar (base de honestidad para la aplicación)
| Ya existe (demostrable) | Parcial / por consolidar | Falta validar con evidencia |
|---|---|---|
| MVP funcional (subida PDF/Excel/CSV → análisis → hallazgos con evidencia/confianza → carta/reporte), 9 bancos objetivo, planes por créditos y Platino (20% recuperado), 1 crédito inicial | Deploy/producción y health completo multi-servicio; secretos/observabilidad (Sentry) operativos; cadena/migración paywall en cloud coordinada con deploy | Tracción real (usuarios, analyses, repetición, revenue), activación/TTFV, % descarga reporte y conversión a reclamo/pago |
| Rediseño v2, 0 violaciones axe (WCAG 2.2 AA) en flujos clave, motor reglas+IA con deduplicación y fallback determinístico | E2E de análisis OK; E2E pagos/flujo completo por re-escribir en nueva arquitectura | Precisión/recall y tasa de falsos positivos en set etiquetado por banco/tipo de cobro |
| Caso fundacional Rodrigo (Rancagua, ~\$500k, >1.000 pagos revisados) como anécdota | Claims de pitch (p.ej. “97% detección”, “NPS 72”, montos agregados recuperados) sin sustento público en repo | Monto recuperable detectado vs. **recuperado real** confirmado por clientes; testimonios verificables (2-3) |

> **Regla para aplicar a incubadoras:** comunicar solo lo medido o claramente etiquetado como “piloto/anecdótico”; llevar evidencia (capturas, logs agregados, tabla de benchmark, testimonios firmados).

---

## 2) Shortlist priorizada de incubadoras/aceleradoras (5–7)

*Probabilidad relativa estimada para el perfil actual (MVP sólido, tracción no medida). Deadlines/terms cambian: **verificar siempre en el sitio oficial antes de aplicar**. Montos y equity son referenciales/típicos.*

| # | Programa | Encaje con CobroDetector | Qué ofrecen (típico) | Etapa / fit | Prob. relativa | Riesgos / consideraciones (equity, timing, foco) |
|---|---|---|---|---|---|---|
| 1 | **Start-Up Chile (CORFO) — BIG, tracks Build / Ignite / Growth** (Chile) | **Mejor fit inmediato**: equity-free, valida wedge local (pymes chilenas, cartolas bancos CL), respaldo institucional y red | Capital no dilutivo por track (Build ~CLP \$15M, Ignite ~CLP \$25M, Growth ~CLP \$50M, ref. convocatorias recientes), mentoría, comunidad, visibilidad | **Build/Ignite** según tracción y años de ventas: prototipo/validación temprana o MVP con primeras señales. Fintech/SaaS B2B elegible | **Media** (sube a media-alta con 20-50 análisis reales y 2-3 pilotos medidos) | **Deadline crítico a verificar:** BIG 13 reportado abierto hasta **24-11-2026 13:00 (GMT-3)** — ventana muy ajustada hoy; confirmar generación vigente y próximos tracks. Exige operación/compromiso en Chile, reportes; competitivo. Sin equity, pero carga de ejecución |
| 2 | **Imagine Lab** (Chile) | Programas de innovación/fintech y conexión con corporates; útil para piloto con comercios/contadores o desafío fintech | Mentoría, red, posibles pilotos/espacios, a veces beneficios no dilutivos (según convocatoria) | Pre-seed/early con MVP y caso de uso claro | **Media** | Oferta variable por cohorte/alianzas (no siempre equity o cash fijo); **verificar convocatoria activa, foco fintech y requisitos**; riesgo de programa corto sin capital significativo |
| 3 | **Magical Startups** (Chile) | Acompañamiento temprano, red local y mentoría para afinar PMF y pitch | Aceleración/incubación, mentoría, comunidad, demo day (términos según programa) | Idea avanzada/MVP temprano | **Media-baja a media** | Confirmar si hay **equity/fee**, monto/beneficios y calendario actual; mejor como paso de preparación si no entra a un grant mayor |
| 4 | **Platanus Ventures** (Chile/LatAm, inversión + comunidad) | Fuerte red técnica/producto; valora founders que construyen rápido y B2B SaaS con dolor claro | Inversión pre-seed/seed y apoyo de comunidad (términos varían por vehículo/programa) | Pre-seed con señal de tracción o founder-market fit muy fuerte; hoy más “aspiracional con evidencia” | **Baja-media ahora** → **Media** con métricas (activación, repetición, revenue/pilotos) | **Toma equity** (términos a verificar; no asumir ticket/%). Muy selectivo; pedirán datos, no narrativa. Foco generalista tech, no exclusivo fintech |
| 5 | **Aceleración universitaria/corporativa local (p.ej. Incuba UC, UDD Ventures, Chrysalis PUCV)** (Chile) | Puente para primeros pilotos con pymes, mentoría y credibilidad local mientras se construye tracción | Mentoría, red, acceso a espacios/comunidad, a veces grants pequeños o concursos | MVP/validación temprana | **Media** (según cupos y fit) | Beneficios heterogéneos; algunos piden vinculación o no dan capital; **verificar convocatoria, equity/costos y encaje sectorial** |
| 6 | **500 Global / programas LatAm** (regional/global) | Escala la ambición a LatAm y endurece métricas; útil tras validar Chile | Aceleración, capital, red global (programas y términos varían por fondo/región) | Pre-seed/seed con algo de tracción y tesis de expansión | **Baja ahora** → **Media** con tracción demostrable | **Equity** y altamente competitivo; timelines por batch (rolling/fechas variables a verificar); conviene cuando ya hay datos |
| 7 | **Y Combinator** (global) | Aspiracional: maximiza señal si se entra; fuerza claridad de problema/crecimiento | Inversión estándar por batch, red, demo day | Desde muy temprano, pero aceptan con tracción excepcional o insight/equipo sobresaliente | **Baja (actual)** | **Equity**; altísima competencia; pedirán “por qué ahora/qué aprendieron de usuarios”. Mejor aplicar cuando existan métricas y loop de crecimiento, no solo MVP |

**Lectura estratégica:** priorizar **(1) Start-Up Chile** por no dilución y fit país (si el timing/track calza) + **(2-3-5)** por pilotos y preparación, y usar **(4,6,7)** como metas una vez construida evidencia de tracción/precisión.

---

## 3) Tesis y narrativa ganadora (adaptada a CobroDetector)

| Bloque | Narrativa | Prueba hoy | Qué falta probar |
|---|---|---|---|
| **Problema** | Las pymes pagan de más por errores/opacidad en cartolas (comisiones duplicadas, cuotas mal cobradas, cargos no reconocidos) y no tienen tiempo ni expertise para auditar miles de movimientos | Dolor concreto y frecuente en comercios; flujo manual lento y técnico | Frecuencia y \$ promedio recuperable por segmento/banco (datos agregados medidos) |
| **Insight** | No es falta de información: es falta de **auditoría accesible y explicable**. El valor está en convertir una cartola en “esto está mal, por qué, cuánto y cómo reclamarlo” | Caso fundacional: Rodrigo (Rancagua) recuperó ~\$500k tras revisar >1.000 pagos por comisión duplicada en cuotas | Repetibilidad del hallazgo en N comercios y tasa de éxito de reclamo |
| **Por qué ahora** | Digitalización de pagos/tarjetas en pymes + madurez de parsing/IA para documentos financieros + presión por márgenes en consumo masivo/retail | MVP operativo con motor reglas+IA y reporte accionable | Evidencia de demanda (intención de pago/uso recurrente) y canal repetible |
| **Solución / producto** | “Sube tu cartola → detectamos anomalías con evidencia y confianza → bajas reporte/carta lista para el banco”. Explicabilidad > caja negra | Hallazgos con evidencia/confianza, deduplicación, fallback determinístico, carta/reporte, UX accesible | % usuarios que completan análisis y descargan/usan la carta |
| **Wedge (cuña)** | **Pymes con alto volumen de transacciones tarjeta en Chile** (carnicerías, retail, restaurantes) empezando por errores de comisión/cuotas; distribución vía contadores y gremios | 9 bancos soportados, especialización local | 1-2 segmentos con mejor TTFV y mayor \$ recuperable |
| **Modelo / alineación** | Créditos por análisis + **Platino (20% de lo recuperado, pago contra resultado)** alinean incentivos y reducen fricción de confianza | Modelo definido en producto | Conversión a pago, ticket, % que elige Platino, revenue inicial |
| **Moat (defendibilidad emergente)** | (1) Motor híbrido **reglas determinísticas + IA explicable** calibrado a formatos/reglas locales, (2) dataset etiquetado por banco/tipo de error, (3) flujo “detección→reclamo→resultado” y confianza, (4) distribución por contadores/gremios | Reglas/evidencia/confianza ya implementadas | Ventaja real depende de datos etiquetados, tasa de recuperación y partnerships; **no afirmar moat fuerte sin tracción** |
| **Visión** | De “auditor de cartolas” a **capa de defensa financiera automática para pymes** (monitoreo continuo, alertas, multi-país LatAm) | Roadmap documentado (v1.1/v2) | Secuencia de expansión condicionada a PMF en Chile |
| **Por qué este equipo (plantilla honesta)** | Equipo capaz de construir y shippear producto técnico (seguridad/BD/arquitectura) enfocado en un dolor local concreto; cercanía al problema pyme | Producto y rediseño ejecutados, criterio de calidad (tests/axe) | Completar con credenciales reales del/los fundadores, acceso a comercios/contadores y velocidad de iteración con usuarios |

**Elevator pitch (30 s):** “CobroDetector ayuda a pymes chilenas a recuperar dinero perdido por cobros bancarios injustificados. Suben su cartola y en minutos obtienen hallazgos explicables con evidencia y una carta lista para reclamar al banco; cobramos por análisis o el 20% de lo recuperado. Estamos convirtiendo un proceso manual y opaco —como el de una carnicería en Rancagua que recuperó ~$500.000 revisando más de 1.000 pagos— en una auditoría accesible y recurrente.”

---

## 4) Las 5 palancas que más mueven aceptación + demo day

| # | Palanca | Acciones concretas (2-4 semanas) | Responsable sugerido | Entregable / evidencia | Impacto |
|---|---|---|---|---|---|
| 1 | **Evidencia medida > claims** | Instrumentar funnel y eventos; correr benchmark etiquetado por banco (precision/recall/FP); registrar “monto recuperable detectado” y, cuando sea posible, “recuperado real”; reemplazar claims no validados por métricas/tabla | Founder + Eng + Product | Dashboard semanal + tabla de benchmark + 2-3 casos con resultado | Elimina la principal objeción (credibilidad) |
| 2 | **Time-to-value y activación impecables** | Onboarding guiado al primer análisis <10 min; muestra de cartola/demo data; reducir fricción de subida/errores; asegurar que el usuario llegue a “hallazgo + \$ + carta” en una sesión | Product + Eng + UX | % signup→primer análisis completado, TTFV medido, flujo sin caídas | Demuestra producto, no slides |
| 3 | **Demo a prueba de balas (narrativa + confiabilidad)** | Entorno estable, datos de demo curados (caso real anonimizado + archivo de muestra), plan B offline/video; guion de 3-5 min con “wow” en evidencia/confianza/carta; Q&A ensayado (regulatorio, precisión, distribución) | Founder + Eng | Runbook de demo, checklist pre-demo, ensayo cronometrado | Gana demo day (claridad y confianza) |
| 4 | **Tracción temprana verificable (pilotos)** | Conseguir 20-50 análisis reales o 10-20 pymes piloto (contadores/gremios/comercios conocidos); capturar testimonios, permisos y antes/después (\$); iterar por feedback | Founder/Growth + Product | Lista de pilotos, testimonios verificables, métricas de uso/repetición | Señal de demanda y PMF temprano |
| 5 | **Wedge y distribución creíble en Chile** | Elegir 1-2 segmentos (ej. carnicerías/retail con alto TPV + contadores) y 1-2 canales repetibles (alianzas con contadores, gremios, referidos); propuesta de valor y pricing claros (crédito vs Platino) | Founder/Growth | ICP definido, script comercial, 1 canal con pruebas de respuesta (tasas de contacto→análisis) | Responde “¿cómo crecen?” y foco |

---

## 5) Plan 30-60-90 días (integrado, accionable)

*Owners sugeridos: **F** Founder/CEO, **P** Product, **E** Eng, **G** Growth. Ajustar a equipo real (pueden ser la misma persona).*

### Días 0–30 — Medir, estabilizar y probar valor
| Objetivo | Iniciativas (a-e) | Owners | Criterios de éxito |
|---|---|---|---|
| Producto medible y demo estable | **(a)** Taxonomía e instrumentación del funnel (signup, upload, análisis iniciado/completado/fallido, reporte descargado, carta generada, pago/crédito, reclamo marcado); tablero semanal. **(e)** Entorno de demo estable, datos de muestra, runbook y plan B | F,P,E | 100% eventos críticos trazando; 1 dashboard operativo; demo corre 3 veces sin fallos |
| Evidencia de precisión inicial | **(c)** Set etiquetado interno por banco/tipo (meta 30-50 archivos/casos si es viable) con ground truth; medir precision/recall/FP y calibrar reglas; documentar limitaciones | P,E | Tabla de benchmark inicial; top causas de FP identificadas y plan de corrección |
| Activación base | **(b)** TTFV <10 min al primer hallazgo; onboarding y manejo de errores de formato; “análisis de ejemplo” para mostrar valor inmediato | P,E | ≥60% de nuevos usuarios de prueba completan primer análisis; TTFV medido |
| Primeros pilotos | **(d)** 5-10 pymes/comercios o 2-3 contadores en piloto; capturar \$ recuperable detectado y feedback | F,G,P | 10-20 análisis reales; ≥2 testimonios/casos con permiso y datos verificables |

### Días 31–60 — Tracción, conversión y unit economics iniciales
| Objetivo | Iniciativas (a-e) | Owners | Criterios de éxito |
|---|---|---|---|
| Validar propuesta de valor | **(b,c)** Iterar sobre FP/UX; seguimiento: ¿descargó reporte? ¿presentó reclamo? ¿resultado? (marcado en producto o encuesta); mejorar explicación de hallazgos | P,E,F | ≥40% de análisis con hallazgos → reporte descargado; registro de estado de reclamo en ≥50% casos contactados |
| Señales de revenue / disposición a pagar | **(d)** Probar pricing (crédito vs Platino) con pilotos; medir conversión y ticket; estimar CAC por canal directo y payback simple | F,G | Primeros pagos o compromisos Platino; conversión a pago medida (aunque sea base chica, reportada honestamente) |
| Tracción verificable | **(c,d)** 20-50 usuarios/analyses reales acumulados; 3-5 testimonios verificables; caso ancla (tipo Rodrigo) documentado con cifras y permiso | F,G | Cohorte usable para demo/pitch; evidencia cualitativa+cuantitativa ordenada |
| Demo “demo day ready” | **(e)** Guion 3-5 min, datos reales anonimizados, métricas en una lámina, manejo de objeciones en vivo | F,P | Ensayo con feedback externo; 0 fallos en 5 corridas |

### Días 61–90 — Repetición, narrativa de crecimiento y aplicación
| Objetivo | Iniciativas (a-e) | Owners | Criterios de éxito |
|---|---|---|---|
| Retención/repetición temprana | **(b)** Recordatorios de nueva cartola/mes, flujo para 2º análisis, valor para contadores multi-cliente (si aplica) | P,G,E | ≥20-30% de usuarios activos piloto hacen 2º análisis o recomiendan (base pequeña, indicar N) |
| Unit economics y foco | **(d)** Consolidar CAC (canal probado), conversión, ticket/ARPA aproximado, payback hipotético; decidir segmento/canal #1 | F,G,P | Modelo simple en una hoja con supuestos explícitos; ICP y canal principal definidos |
| Cierre de readiness | **(a-e)** Paquete de aplicación: métricas, benchmark, testimonios, demo, deck alineado a tesis; aplicaciones enviadas (según shortlist/timing) | F (+P) | ≥1-2 postulaciones de alta prioridad enviadas con evidencia; backlog de producto priorizado post-feedback |

---

## 6) North-star y métricas (definiciones, medición, targets early-stage)

**North-star sugerida:** **“Monto recuperable neto explicado y llevado a acción por mes”** (suma de \$ recuperable en hallazgos de confianza media/alta que terminan en reporte descargado o reclamo iniciado). *Proxy de valor real entregado, no vanity de uploads.*

| Métrica | Definición operativa | Cómo medirla (en este producto) | Target early-stage realista (30-90 días) |
|---|---|---|---|
| **Activación** | Usuario completa **primer análisis con resultado** (éxito) tras signup | Evento `analysis_completed` con `is_first=true` / cohorte por `signed_up` | 40-60% de signups que suben archivo lo completan; mejorar semana a semana |
| **Time-to-value (TTFV)** | Tiempo desde signup (o desde upload) a **ver primer hallazgo accionable** / reporte disponible | Timestamp diff `signed_up`→`analysis_completed` y →`report_viewed/downloaded` | <10 min desde upload en flujo feliz; <24 h desde signup al 1er análisis |
| **% reportes descargados** | Análisis completados con ≥1 hallazgo donde se descarga/visualiza reporte o carta | `report_downloaded` / `claim_letter_generated` ÷ `analysis_completed_with_findings` | 30-50% inicial; meta 60%+ con buen UX |
| **Conversión a reclamo (acción)** | Usuarios que marcan reclamo enviado/presentado (o declaran intención verificable) | Estado en `claim_tracking` / encuesta post-reporte | 20-40% de quienes descargan reportan acción (medir por encuesta si falta tracking) |
| **Repeat usage** | Usuario realiza ≥2 análisis en 60-90 días (o contadores: N clientes) | Distinct `analysis_completed` por `user_id` en ventana | 20-30% en pilotos (señal temprana); reportar N |
| **Conversión a pago** | Free→compra de créditos o activación Platino | `payment_succeeded` / `credits_purchased` ÷ usuarios elegibles activados | 5-15% de activados (base pequeña; medir por cohorte) |
| **CAC (aprox.)** | (Tiempo founder×costo oportunidad + \$ directos de canal) ÷ clientes/pilotos adquiridos | Planilla por canal/semana (outreach, demos, referidos) | Meta: conocerlo por canal; en early-stage manual puede ser “alto pero aprendible” — optimizar canal #1 |
| **LTV / Payback (aprox.)** | LTV proxy = ticket promedio × analyses esperados/año; payback = CAC ÷ margen por cliente/mes | Tickets reales + frecuencia observada; supuestos explícitos | **No afirmar** sin 2-3 meses de datos; presentar escenario conservador/base/optimista |
| **Monto recuperable detectado vs recuperado real** | \$ hallado (con confianza) vs \$ efectivamente devuelto/ajustado por banco | Suma `amount_recoverable` por análisis vs confirmación usuario (evidencia/estado reclamo) | Reportar ambos; target: validar ≥5 casos con recuperación real confirmada |
| **Precisión / tasa de FP** | Precision = TP/(TP+FP); FP rate por hallazgo/tipo/banco (en set etiquetado y en feedback real) | Benchmark etiquetado + `anomaly_feedback` + revisión manual muestral | Establecer baseline honesto; mejora sostenida y FP críticos < umbral acordado por segmento (no prometer 97% sin prueba) |

---

## 7) Diseño de la demo para demo day (3–5 min)

| Tiempo | Flujo | Qué mostrar (dato/caso) | “Wow moments” | Qué evitar |
|---|---|---|---|---|
| 0:00–0:40 | **Problema + insight** | 1 frase: “las pymes pierden plata en cobros que no auditan”. Caso Rodrigo (Rancagua, ~\$500k, >1.000 pagos, comisión duplicada en cuotas) como anécdota fundacional | Dolor tangible en \$ y volumen | Claims agregados no verificados (“millones recuperados” sin respaldo) |
| 0:40–1:20 | **Solución en vivo** | Subir cartola de muestra (anonimizada/curada) y lanzar análisis | De archivo caótico a resultado en minutos; UX clara | Depender de Wi-Fi/servicios inestables sin plan B |
| 1:20–2:30 | **Hallazgos explicables** | 2-3 hallazgos con **evidencia, confianza y \$ recuperable**; mostrar deduplicación/explicación | “No es caja negra”: por qué es un cobro indebido y cuánto vale | Jerga técnica/IA innecesaria; mostrar FP o casos ambiguos sin explicación |
| 2:30–3:20 | **Acción y modelo** | Descargar reporte/carta lista para banco; mencionar crédito vs **Platino 20% de lo recuperado** (alineación) | Cierra el loop “detectar → reclamar” | Prometer recuperación garantizada o asesoría legal |
| 3:20–4:10 | **Tracción/evidencia** | 2-3 métricas reales (analyses, TTFV, % descarga, pilotos) + 1 testimonio verificable; benchmark si existe | Honestidad + señal de aprendizaje | Métricas inventadas o vanity (visitas) |
| 4:10–5:00 | **Visión + ask** | Cuña Chile (pymes/contadores) → monitoreo continuo/LatAm; qué busca de la incubadora (pilotos, red, capital, mentoría) | Foco y próximos 90 días | Roadmap difuso sin próximo hito medible |

**Manejo de objeciones en vivo:** precisión/FP (evidencia+confianza+benchmark+feedback), alcance (herramienta informativa, no intermediación ni asesoría legal), dependencia de formatos (9 bancos, reglas+IA+fallback), distribución (ICP contadores/gremios, canal probado).

**Runbook:** entorno pre-calentado, usuario demo, archivo de respaldo, captura/video de contingencia, checklist de secretos/health antes de presentar.

---

## 8) Experimentos de tracción rápidos (Chile, low-cost, 20–50 análisis reales)

| # | Canal / táctica | Acción concreta | Meta (4-8 semanas) | Cómo convertirlo en prueba social creíble |
|---|---|---|---|---|
| 1 | **Red directa del fundador (comercios conocidos)** | Visitar/contactar 30-50 pymes (carnicerías, minimarkets, restaurantes) con alto pago tarjeta; ofrecer análisis gratuito/piloto y acompañar la subida | 10-20 análisis, 3-5 casos con hallazgos | Testimonio con nombre/rubro (o anonimizado con permiso), foto/logo si acepta, cifra \$ detectada y, si ocurre, recuperada |
| 2 | **Contadores independientes/oficinas contables** | Proponer “auditoría rápida de cartolas” para su cartera; 1 sesión demo + 3 análisis de prueba por contador | 5-10 contadores activos, 15-30 análisis | Caso de uso B2B2C (“X clientes revisados, \$Y detectado”), carta de referencia o cita atribuible |
| 3 | **Gremios/agrupaciones pyme** (comercio local, cámaras, asociaciones de barrio/rubro) | Charla/taller corto “cómo detectar cobros indebidos en tu cartola” + QR a prueba guiada | 1-2 actividades, 10+ leads, 10-20 análisis | Lista de asistentes (agregada), NPS/feedback cualitativo, 1-2 mini-casos públicos con permiso |
| 4 | **Contenido útil y localizado** (LinkedIn/WhatsApp/Instagram) | Micro-guías: “3 cobros a revisar en tu cartola de [banco]”, checklist descargable; CTA a análisis con 1 crédito | 20-50 registros/leads, 10-20 análisis | Métricas de funnel publicables (CTR→signup→análisis) y comentarios/capturas de interés (sin inflar) |
| 5 | **Referidos desde casos ganadores** | Tras cada hallazgo con \$ relevante, pedir referido a otro comercio y ofrecer revisión conjunta | +5-10 análisis por referidos | Registrar fuente “referido” y tasa de conversión; testimonios encadenados verificables |

**Reglas de credibilidad:** consentimientos para usar datos/casos, anonimizar cartolas, separar **detectado** vs **recuperado**, y guardar evidencia (export de métricas, capturas, mensajes) en una carpeta “data room” para aplicaciones.

---

## 9) Backlog priorizado de readiness (RICE simple, 8–10 ítems)

*RICE = (Reach × Impact × Confidence) / Effort (escala relativa).*

| Pri | Ítem | R | I | C | E | RICE (≈) | Owner | Resultado esperado |
|---|---|---:|---:|---:|---:|---:|---|---|
| 1 | **Instrumentación de funnel y dashboard** (eventos, cohortes, TTFV, descarga, pago) | 10 | 10 | 8 | 4 | 200 | E,P | Medir todo lo que exige una incubadora |
| 2 | **Set de benchmark etiquetado + reporte precision/recall/FP por banco** | 8 | 10 | 7 | 5 | 112 | P,E | Evidencia de calidad y límites del motor |
| 3 | **Estabilización de demo/producción mínima** (health, secretos, deploy confiable, plan B) | 10 | 9 | 8 | 4 | 180 | E,F | Demo impecable y pilotos sin caídas |
| 4 | **Optimizar activación/TTFV** (onboarding, muestra, manejo de errores de formato) | 9 | 9 | 7 | 4 | 142 | P,E | Más usuarios llegan a “valor” en 1ª sesión |
| 5 | **Tracking de outcome de reclamo** (descargó → envió → respondió/recuperó) | 7 | 9 | 6 | 3 | 126 | P,E | Probar valor real, no solo detección |
| 6 | **Programa de pilotos (20-50 análisis) + captación de 3-5 testimonios verificables** | 8 | 9 | 6 | 5 | 86 | F,G | Tracción y prueba social creíble |
| 7 | **Materiales de aplicación/demo day** (deck con métricas, narrativa, data room, guion Q&A) | 10 | 8 | 7 | 3 | 187 | F,P | Postulación y demo consistentes y defendibles |
| 8 | **Hardening y confianza** (auditoría seguridad/BD, RLS/RPC, paywall cloud coordinado, observabilidad) | 8 | 8 | 7 | 5 | 90 | E | Reducir riesgo técnico/regulatorio percibido |
| 9 | **Experimentos de canal contador/gremio** (ICP, scripts, medición CAC/respuesta) | 7 | 8 | 5 | 4 | 70 | F,G | Respuesta creíble a “go-to-market” |
| 10 | **Mejora de precisión por banco/formato** (parsers/reglas guiadas por FP del benchmark) | 7 | 8 | 6 | 5 | 67 | E,P | Menos fricción y mayor confianza en cuña |

---

## 10) Riesgos / objeciones y mitigaciones

| Objeción / riesgo | Probabilidad | Impacto | Mitigación y respuesta preparada |
|---|---|---|---|
| **Claims no verificables** (97%, montos, NPS) | Alta si se repiten | Alto (credibilidad) | Comunicar solo métricas medidas; etiquetar anécdotas; llevar benchmark y data room |
| **Precisión / falsos positivos** (confianza del usuario y del jurado) | Media | Alto | Motor explicable con evidencia/confianza, revisión humana, benchmark por banco, feedback loop y umbrales de confianza |
| **Dependencia de formatos bancarios/PDFs** y cambios | Media-alta | Medio-alto | Cobertura de 9 bancos, parsers robustos + reglas + IA con fallback determinístico; priorizar por volumen; monitorear fallos |
| **Regulatorio/alcance fintech** (confusión con asesoría financiera o intermediación) | Media | Medio-alto | Posicionar como **herramienta de análisis/información y soporte de reclamo**; no mover dinero ni prometer resultados legales; validar disclaimers/alcance con counsel al escalar |
| **Privacidad y seguridad de datos sensibles** (cartolas) | Media | Alto | RLS/mínimo privilegio, cifrado/KEK y manejo de secretos, retención clara, no exponer `service_role`; `/audit` y hardening antes de escalar pilotos |
| **Tracción insuficiente / “solo MVP”** | Alta hoy | Alto | Ejecutar 30-60 días de pilotos medidos (20-50 análisis), testimonios y canal; mostrar aprendizaje y velocidad |
| **Escalabilidad técnica y costos** (procesamiento, LLM, soporte) | Media | Medio | Reglas determinísticas primero (costo/predecibilidad), IA como capa opcional, cola/worker y métricas de costo por análisis; índices/retención en tablas append-only |
| **Competencia** (apps finanzas personales, servicios contables, bancos mejorando UX) | Media | Medio | Wedge B2B pyme + foco en **errores/cobros indebidos** + reporte/carta accionable + pago contra resultado (Platino); velocidad sobre dataset local |
| **Riesgo de timing (convocatorias)** | Alta (ej. ventana BIG reportada muy próxima) | Medio | Verificar deadlines hoy, preparar “application kit” reusable y aplicar en ola (local → regional → global) |

---

## 11) Evidencia mínima creíble antes de aplicar

**Mínimo para ser competitivo en programas early (Chile):**
- **Producto:** demo funcional end-to-end con archivo real/anonimizado (subida → hallazgos con evidencia/\$ → reporte/carta) y estabilidad básica.
- **Usuarios/pilotos:** 10-20 pymes o 3-5 contadores probándolo, con **20-50 análisis reales** en total (aunque sea en piloto guiado).
- **Valor:** 3-5 casos documentados con \$ detectado y, idealmente, ≥2 con resultado de reclamo/recuperación o testimonio verificable; separar detectado vs recuperado.
- **Calidad:** baseline honesto de precisión/FP en una muestra etiquetada pequeña (por tipo/banco) + mecanismo de feedback.
- **Métricas:** funnel básico (activación, TTFV, % descarga, repetición) medido, aunque N sea modesto (reportar N).
- **Negocio:** segmento/ICP y canal inicial, pricing probado cualitativamente, 1 hipótesis de unit economics con supuestos.
- **Equipo y foco:** quién construye, quién vende, compromiso y próximos 90 días con hitos medibles.

**Mínimo para subir probabilidad en aceleradoras de inversión (Platanus/500/YC):** lo anterior + señal de repetición/revenue o crecimiento de uso, y aprendizaje claro de clientes.

---

## 12) Recursos GitHub (>100k★) y cómo usarlos (con flujo de agentes/skills)

### Recurso ancla (>100k★)
- **[`sindresorhus/awesome`](https://github.com/sindresorhus/awesome)** — **>500k★**, hub curado de “awesome lists” (calidad y mantenimiento comunitario). Úsalo como **índice** para llegar a listas específicas de negocio, fundraising y producto.

### Cómo sacarle valor concreto para incubadora
| Necesidad | Desde `awesome` / listas curadas a consultar | Uso concreto en CobroDetector |
|---|---|---|
| Fundraising y aplicación | Sección **Work/Business** y listas tipo `awesome-fundraising`, `awesome-startup-resources` (acceder vía awesome) | Checklists de materiales (deck, one-pager, data room), preguntas típicas, listas de inversores/aceleradoras y plantillas de outreach |
| Pitch y narrativa | Recursos de pitch/startup en listas curadas (pitch decks, storytelling) | Afinar narrativa (problema-insight-wedge-métrica-ask), guion de 3-5 min y lámina de métricas |
| Producto/crecimiento B2B | Listas de analytics, growth, SaaS/product | Elegir stack de instrumentación, definir eventos del funnel y experimentos de activación/retención |
| Legal/seguridad/compliance (referencia) | Listas de security/privacy/compliance | Checklist de disclaimers, manejo de datos sensibles y preparación para objeciones (validar con counsel local) |

> **Nota:** muchas listas enlazadas desde awesome tienen <100k★ individualmente; el repo **>100k★** que cumple el criterio y aporta mayor apalancamiento como punto de entrada es **sindresorhus/awesome**. Trátalas como **insumos de checklist**, no como verdad de mercado.

### Flujo operativo recomendado (agentes + skills + herramientas)
1. **Descubrimiento y plan (día 0):** cargar `brainstorming` + `product-manager`/`deal-strategist` → fijar ICP, tesis, shortlist y plan 30-60-90 (este documento) → persistir decisiones en `engram`.
2. **Investigación y aplicación:** `websearch`/`webfetch` para deadlines/terms oficiales de cada programa; usar `sindresorhus/awesome` para checklists de fundraising/pitch; preparar “application kit” reusable.
3. **Instrumentación y producto:** `cobro-detector-db` + `supabase-postgres-best-practices` + `database-optimizer` para eventos/índices/consultas de métricas; `test-engineer` para regresión; `verification-before-completion` antes de congelar demo.
4. **Confianza y seguridad:** `security-and-hardening` + `/audit` (`security-auditor`) para RLS/RPCs/secretos/manejo de cartolas; coordinar rollout cloud de migraciones breaking (p.ej. paywall) con deploy.
5. **Calidad de entrega:** `/review` y `/test` en cada hito; ensayar demo con runbook; actualizar métricas/benchmark semanalmente y alimentar la postulación con evidencia (no claims).

**Próximo paso inmediato (esta semana):** confirmar en los sitios oficiales el estado/fechas de **Start-Up Chile BIG** y 2-3 alternativas locales, y ejecutar el bloque Días 0–30 (instrumentación + 10-20 análisis piloto + benchmark inicial) para convertir la narrativa en evidencia defendible.
