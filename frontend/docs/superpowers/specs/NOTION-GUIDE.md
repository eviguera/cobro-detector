# Notion — Guía de Importación

> Cómo subir los 6 documentos de CobroDetector a Notion en 3 pasos.

---

## Paso 1: Crear la página principal

1. Abre Notion
2. Crea una nueva página llamada **"CobroDetector — Documentación"**
3. Pega este contenido como introducción (para tener un índice):

```markdown
# CobroDetector — Documentación del Proyecto

Plataforma SaaS chilena de detección de cobros injustificados en estados de cuenta bancarios mediante IA.

## Índice de Documentos

1. **PRD** — Product Requirements Document: qué y por qué
2. **TRD** — Technical Requirements Document: stack y arquitectura
3. **UI/UX** — Diseño de interfaz: sistema de diseño, wireframes, páginas
4. **Flujos** — Diagramas de secuencia: registro, análisis, pagos, reportes
5. **Backend Schema** — Base de datos: 12 tablas, API, seguridad
6. **Plan de Implementación** — Roadmap: AS-IS + fases futuras

---

## Resumen Rápido

| Métrica | Valor |
|---------|-------|
| **Stack** | Next.js 14 + Supabase + Groq IA + MercadoPago |
| **DB** | PostgreSQL + 12 tablas + RLS + 38 políticas |
| **Modelo** | 4 planes (Inicial $20K → Platino 20%) |
| **Testing** | 15 unitarios + 10 E2E (100% pass) |
| **Estado** | v1.0 en producción |
```

---

## Paso 2: Crear sub-páginas e importar cada documento

Para cada uno de los 6 archivos, repite este proceso:

### Método A: Importar archivo .md (recomendado)

1. En la barra lateral de Notion, haz clic en **"+"** junto a "Private" o en el espacio de trabajo
2. Selecciona **"Import"**
3. Elige **"Markdown & CSV"**
4. Selecciona el archivo `.md`
5. Notion crea una nueva página con el contenido
6. Arrástrala dentro de "CobroDetector — Documentación" para que quede como sub-página

> **Importante**: El nombre del archivo se convierte en el título de la página. Renómbralo si quieres:
> - `2026-05-26-prd.md` → "1. PRD — Requisitos de Producto"
> - `2026-05-26-trd.md` → "2. TRD — Requisitos Técnicos"
> - `2026-05-26-ui-ux.md` → "3. UI/UX — Diseño de Interfaz"
> - `2026-05-26-flujos.md` → "4. Flujos — Diagramas de Secuencia"
> - `2026-05-26-backend-schema.md` → "5. Backend — Schema y API"
> - `2026-05-26-plan-implementacion.md` → "6. Plan de Implementación"

### Método B: Copiar y pegar (alternativa rápida)

Si la importación falla, abre cada archivo `.md` en VS Code, selecciona todo (`Cmd+A`), copia (`Cmd+C`), y pega (`Cmd+V`) en una nueva página de Notion.

---

## Paso 3: Ordenar y embellecer

### Orden recomendado

Arrastra las sub-páginas en este orden dentro de la página principal:

```
CobroDetector — Documentación
  ├── 1. PRD — Requisitos de Producto
  ├── 2. TRD — Requisitos Técnicos
  ├── 3. UI/UX — Diseño de Interfaz
  ├── 4. Flujos — Diagramas de Secuencia
  ├── 5. Backend — Schema y API
  └── 6. Plan de Implementación
```

### Ajustes post-importación (opcionales)

| Elemento | Qué verificar |
|----------|---------------|
| **Portada** | Agrega un ícono a cada página (🛡️ PRD, ⚙️ TRD, 🎨 UI/UX, 🔄 Flujos, 🗄️ Schema, 📋 Plan) |
| **Tablas** | Revisa que las columnas estén alineadas. Si una tabla se rompe, usa "Turn into → Table" |
| **Código** | Los bloques de código importan bien. Si el formato monoespaciado falla, selecciona el bloque y elige "Code" |
| **Checklists** | Los `- [x]` y `- [ ]` se convierten en checkboxes nativos de Notion ✅ |
| **Callouts** | Los `>` se convierten en bloques de cita. Si quieres callouts de color, sustitúyelos manualmente |
| **Links cruzados** | Los links entre documentos (ej: `[PRD](./2026-05-26-prd.md)`) tendrás que actualizarlos a links de Notion (`@1. PRD`) |

---

## Estructura final en Notion

```
🏠 CobroDetector — Documentación
   │
   ├── 🛡️ 1. PRD — Requisitos de Producto
   │     • Resumen ejecutivo
   │     • Problema y caso Rodrigo
   │     • Propuesta de valor (3 pilares)
   │     • Usuarios y personas (3 perfiles)
   │     • Funcionalidades AS-IS (10 módulos)
   │     • Modelo de negocio (4 planes)
   │     • KPIs y métricas
   │     • Roadmap (3 fases)
   │
   ├── ⚙️ 2. TRD — Requisitos Técnicos
   │     • Stack tecnológico (tabla completa)
   │     • Arquitectura (diagrama)
   │     • Estructura del proyecto
   │     • Decisiones técnicas clave (7 decisiones)
   │     • API Design (12 endpoints)
   │     • Seguridad (5 capas)
   │
   ├── 🎨 3. UI/UX — Diseño de Interfaz
   │     • Sistema de diseño (colores, tipografía)
   │     • Landing page (wireframe ASCII)
   │     • Login/Registro (estados)
   │     • Dashboard (layout + sidebar)
   │     • Análisis (upload + progreso + resultados)
   │     • Historial y detalle
   │     • Precios
   │     • Responsive design
   │
   ├── 🔄 4. Flujos — Diagramas de Secuencia
   │     • Flujo 1: Registro
   │     • Flujo 2: Login
   │     • Flujo 3: Análisis de estado de cuenta
   │     • Flujo 4: Pago plan fijo (MercadoPago)
   │     • Flujo 5: Pago Platino (unlock)
   │     • Flujo 6: Generación de reporte (DOCX/PDF)
   │     • Flujo 7: API Key (v1)
   │     • Flujo 8: Multi-empresa
   │     • Flujo 9: Logout (CSRF)
   │
   ├── 🗄️ 5. Backend — Schema y API
   │     • Diagrama ER (ASCII)
   │     • 12 tablas (detalle completo)
   │     • Funciones (internal + public)
   │     • Vistas (2)
   │     • API endpoints (tabla)
   │     • Pipeline de análisis (diagrama)
   │     • Seguridad DB
   │
   └── 📋 6. Plan de Implementación
         • Checklist AS-IS (completado)
         • Fase 1: Crítico (1-2 semanas)
         • Fase 2: Mejoras (3-6 semanas)
         • Fase 3: Opcionales (2-3 meses)
         • Riesgos (8 riesgos con mitigación)
         • Historial de releases (v0.1 → v2.0)
```

---

## Resumen de archivos

| Archivo | Tamaño | Líneas | Listo para Notion |
|---------|--------|--------|-------------------|
| `2026-05-26-prd.md` | 11 KB | 254 | ✅ |
| `2026-05-26-trd.md` | 16 KB | 314 | ✅ |
| `2026-05-26-ui-ux.md` | 39 KB | 595 | ✅ |
| `2026-05-26-flujos.md` | 41 KB | 548 | ✅ |
| `2026-05-26-backend-schema.md` | 26 KB | 537 | ✅ |
| `2026-05-26-plan-implementacion.md` | 10 KB | 243 | ✅ |
| **Total** | **143 KB** | **2,491** | ✅ |

Todos los archivos están en: `docs/superpowers/specs/`
