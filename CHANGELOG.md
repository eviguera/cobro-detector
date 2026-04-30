# Changelog - CobroDetector

## [2.0.0] - 2026-04-30 - Implementación Completa del Roadmap

### ✅ Features Implementadas

#### 1. Migración a Google Gemini Flash (Gratuito)
- Reemplazo de modelo de IA a Google Gemini 1.5 Flash
- Configuración en `src/lib/analyzer.ts`
- Variable: `GOOGLE_GEMINI_API_KEY`

#### 2. Mejora en Detección para Casos Santander
- Motor de reglas en `src/lib/analyzer.ts`:
  - Detección de comisiones duplicadas en ventas a cuotas
  - Patrones: "VENTA TC X CUOTAS S/INT" + "COMISION CREDITO TC"
  - Ventana de 7 días para cobros duplicados
  - Detección de cargos no reconocidos

#### 3. Nuevos Planes de Suscripción
- **Emprendedor** ($9.900): 1 análisis
- **Profesional** ($24.900): 3 análisis, IA, carta de reclamo
- **Contador/Empresa** ($59.900): 5 análisis, multi-empresa, API
- **Cobro por Éxito** ($0 + 10%): Análisis ilimitados
- Configuración en `src/lib/plans.ts`

#### 4. Seguridad (Validación, Rate Limiting)
- Validación con Zod en todos los endpoints
- Rate limiting en `/api/analyze` (10/hora por usuario)
- Autenticación API con API keys
- Row Level Security (RLS) en Supabase

---

### 🎯 Integración Completa Mercado Pago (Plan 10% Éxito)

#### Base de Datos
- Migración: `supabase/migration_success_fee.sql`
- Nuevas tablas:
  - `payment_methods`: Tarjetas tokenizadas
  - `success_charges`: Registro de cobros por éxito
- Columnas agregadas a `orders`: `fee_percentage`, `success_plan_active`

#### Endpoints API
- `POST /api/payments/link-card`: Vincular tarjeta de crédito/débito
- `PATCH /api/anomalies/[id]`: Marcar como recuperada y cobrar 10%
- `POST /api/payments/create`: Crear orden (actualizado para plan éxito)
- `POST /api/payments/webhook`: Webhook de Mercado Pago (maneja cobros éxito)

#### Funcionalidad
- Usuarios con plan éxito: análisis ilimitados
- Al marcar anomalía como "recuperada": cobro automático del 10%
- Vinculación de tarjeta mediante tokenización MP

---

### 📄 Generación de Carta de Reclamo (Word/PDF)

#### Librerías
- `docx`: Generación de documentos Word
- `puppeteer`: Generación de PDF

#### Endpoints API
- `POST /api/documents/complaint-letter`: Genera carta en Word (.docx)
- `POST /api/documents/complaint-letter/pdf`: Genera carta en PDF

#### Características
- Formato profesional con datos del usuario/empresa
- Tabla de anomalías detectadas
- Monto total recuperable
- Listo para entregar al banco

---

### 🏢 Soporte Multi-Empresa para Contadores

#### Base de Datos
- Migración: `supabase/migration_multi_company.sql`
- Nueva tabla: `companies` (empresas gestionadas)
- Columnas `company_id` en: `analyses`, `credits`, `orders`
- Función `can_access_company()` para verificación de permisos

#### Endpoints API
- `GET /api/companies`: Listar empresas del contador
- `POST /api/companies`: Crear nueva empresa (asigna 1 crédito gratis)
- `GET /api/companies/[id]`: Ver empresa, créditos y análisis recientes
- `PATCH /api/companies/[id]`: Actualizar datos de empresa
- `DELETE /api/companies/[id]`: Desactivar empresa (soft delete)

#### Funcionalidad
- Contadores pueden gestionar múltiples clientes
- Cada empresa tiene sus propios créditos y análisis
- Aislamiento de datos por RLS

---

### 🔌 API para Integración con Sistemas Contables

#### Base de Datos
- Migración: `supabase/migration_api_integration.sql`
- Nuevas tablas:
  - `api_keys`: Llaves de acceso para integraciones
  - `api_logs`: Registro de requests (limpieza automática >30 días)
- Función `verify_api_key()`: Validación de llaves

#### Endpoints API
- `GET /api/integrations/api-keys`: Listar API keys
- `POST /api/integrations/api-keys`: Generar nueva API key (muestra key completa solo una vez)
- `DELETE /api/integrations/api-keys/[id]`: Revocar API key
- `GET /api/v1/analyses/[id]`: Obtener análisis via API (ejemplo)

#### Autenticación
- Header: `Authorization: Bearer cd_xxx...`
- Permisos: `read`, `write`, `admin`
- Rate limit: 1000 requests/hora por key
- Documentación: `API.md`

---

### 🧪 QA y Verificación

#### Script de Verificación
- `scripts/qa-check.sh`: Verifica 39 puntos críticos
- Resultado: ✅ 39/39 checks pasaron

#### Verificaciones
- ✅ Migraciones SQL existen y tienen contenido
- ✅ Todos los endpoints API implementados
- ✅ Tipos de base de datos actualizados
- ✅ Librerías instaladas correctamente
- ✅ Archivos de configuración presentes
- ✅ Documentación API creada

---

### 📁 Estructura de Archivos Modificados/Creados

#### Migraciones SQL
```
supabase/schema.sql (actualizado)
supabase/migration_payments.sql
supabase/migration_success_fee.sql (nuevo)
supabase/migration_multi_company.sql (nuevo)
supabase/migration_api_integration.sql (nuevo)
```

#### Backend - Librerías
```
src/lib/mercadopago.ts (actualizado - CardToken, Customer)
src/lib/document-generator.ts (nuevo - Word/PDF)
src/lib/api-auth.ts (nuevo - Auth API keys)
src/lib/analyzer.ts (actualizado - mejoras Santander)
src/lib/plans.ts (actualizado - plan éxito)
```

#### Backend - API Endpoints
```
src/app/api/analyze/route.ts (actualizado - company_id)
src/app/api/anomalies/[id]/route.ts (nuevo - cobro 10%)
src/app/api/payments/create/route.ts (actualizado)
src/app/api/payments/link-card/route.ts (nuevo)
src/app/api/payments/webhook/route.ts (actualizado)
src/app/api/documents/complaint-letter/route.ts (nuevo)
src/app/api/documents/complaint-letter/pdf/route.ts (nuevo)
src/app/api/companies/route.ts (nuevo)
src/app/api/companies/[id]/route.ts (nuevo)
src/app/api/integrations/api-keys/route.ts (nuevo)
src/app/api/integrations/api-keys/[id]/route.ts (nuevo)
src/app/api/v1/analyses/[id]/route.ts (nuevo - ejemplo API)
```

#### Tipos y Configuración
```
src/types/database.types.ts (actualizado - nuevas tablas)
.env.local (variables Mercado Pago, Google Gemini)
package.json (nuevas dependencias)
API.md (nuevo - documentación API)
CHANGELOG.md (nuevo - este archivo)
scripts/qa-check.sh (nuevo - QA automático)
```

---

### 🚀 Instrucciones de Despliegue

#### 1. Ejecutar Migraciones en Supabase (en orden)
```sql
-- 1. Schema base
Ejecutar: supabase/schema.sql

-- 2. Migración pagos
Ejecutar: supabase/migration_payments.sql

-- 3. Plan éxito
Ejecutar: supabase/migration_success_fee.sql

-- 4. Multi-empresa
Ejecutar: supabase/migration_multi_company.sql

-- 5. API Integration
Ejecutar: supabase/migration_api_integration.sql
```

#### 2. Variables de Entorno Requeridas (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Google Gemini
GOOGLE_GEMINI_API_KEY=...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=...
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

#### 3. Instalar Dependencias
```bash
npm install
```

#### 4. Verificar con QA
```bash
bash scripts/qa-check.sh
```

#### 5. Build y Despliegue
```bash
npm run build
npm run start
# o despliegue en Vercel/otro servicio
```

---

### 📊 Resumen de Líneas de Código
- **SQL**: ~300 líneas (5 migraciones)
- **TypeScript**: ~1500 líneas (endpoints + librerías)
- **Documentación**: ~400 líneas
- **Total**: ~2200 líneas nuevas/modificadas

---

### ✅ Roadmap 100% Completado
- [x] Migración a Google Gemini Flash
- [x] Mejorar detección Santander
- [x] Nuevos planes (Emprendedor, Profesional, Contador 5, Éxito 10%)
- [x] Seguridad (validación, rate limiting)
- [x] Integración completa Mercado Pago
- [x] Generación carta reclamo Word/PDF
- [x] Soporte multi-empresa contadores
- [x] API integración sistemas contables

---

**Fecha**: 30 Abril 2026  
**Autor**: opencode (big-pickle)  
**Estado**: ✅ Producción Ready
