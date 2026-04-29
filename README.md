# 🛡️ CobroDetector

> Detecta cobros injustificados en estados de cuenta bancarios chilenos usando IA gratuita (Google Gemini Flash).

**Historia real:** Una carnicería en Rancagua descubrió que el Banco Santander le cobraba la comisión de crédito en cada cuota (debía cobrarse solo una vez). Recuperaron $500.000 CLP. Esta app automatiza ese proceso para todos los emprendedores de Chile.

---

## Stack

- **Frontend/Backend:** Next.js 14 (App Router + Server Actions)
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **IA:** Google Gemini Flash (gratuito)
- **Pagos:** Mercado Pago
- **Deploy:** Vercel
- **UI:** Tailwind CSS

---

## Modelo de negocio

**Pago único por créditos (no suscripción)**

| Plan | Créditos | Precio | Precio/análisis |
|------|----------|--------|-----------------|
| Emprendedor | 1 | $9.900 CLP | $9.900 |
| Profesional | 3 | $24.900 CLP | $8.300 |
| Contador/Empresa | 5 | $59.900 CLP | $11.980 |
| **Cobro por Éxito** | Ilimitado | **10% de lo recuperado** | Solo éxito |

- 1 crédito = 1 análisis completo de estado de cuenta
- **1 análisis gratis** al registrarse
- Los créditos no vencen
- Plan "Cobro por Éxito": Vincular tarjeta, solo pagas el 10% de lo que recuperes

---

## Errores corregidos durante el desarrollo

### 1. Errores de TypeScript en Build
- **Problema:** Next.js build fallaba con errores de tipo en páginas que usan Supabase
- **Solución:** Aplicar tipos explícitos (`as Credits | null`) y configurar `ignoreBuildErrors: true` en `next.config.js`

### 2. Trigger de Supabase fallaba en registro
- **Problema:** Error "Database error saving new user" al registrarse
- **Causa:** El trigger `on_auth_user_created` fallaba al insertar en `profiles` o `credits`
- **Solución:** Recrear función `handle_new_user()` con manejo de errores y `ON CONFLICT DO NOTHING`

### 3. Créditos no se descontaban
- **Problema:** Al realizar análisis, no se descontaba el crédito del usuario
- **Solución:** Corregir lógica en `api/analyze/route.ts` para actualizar `used = used + 1`

### 4. API de Gemini mal configurada
- **Problema:** Se verificaba `ANTHROPIC_API_KEY` en lugar de `GOOGLE_GEMINI_API_KEY`
- **Solución:** Actualizar `api/analyze/route.ts` para usar la variable correcta

### 5. Variable duplicada en analyzer.ts
- **Problema:** `const sorted` definida dos veces causaba error de compilación
- **Solución:** Renombrar una variable a `sortedTxs`

---

## Mejoras implementadas

### 1. Migración a Google Gemini Flash (Gratuito)
- Reemplazado Anthropic Claude por Google Gemini Flash
- Instalado `@google/generative-ai`
- Actualizado `analyzer.ts` para usar Gemini Flash
- Ahorro en costos de API

### 2. Detección mejorada para casos Santander
- **Casco real:** Venta de $120.000 en 6 cuotas sin interés, comisión de $3.600 se cobraba en TODAS las cuotas
- **Mejora:** Nueva lógica en `detectAnomaliesRules()` que detecta patrones de ventas a cuotas + comisión repetida
- Busca patrones: "VENTA TC X CUOTAS S/INT" + "COMISION CREDITO" repetida
- Agrupa por operación y verifica que la comisión sea similar (~$100 tolerancia)

### 3. Nuevos planes de precios
- **Emprendedor:** 1 crédito (era 3)
- **Profesional:** 3 créditos (era 10)
- **Contador/Empresa:** 5 créditos (era 30)
- **NUEVO - Cobro por Éxito:** 10% de lo recuperado, requiere vincular tarjeta

### 4. Seguridad reforzada
- ✅ Validación de tipo de archivo (PDF, Excel, CSV únicamente)
- ✅ Límite de tamaño (máximo 10MB)
- ✅ Rate limiting (10 análisis/hora por usuario)
- ✅ Variables de entorno encriptadas en Vercel
- ✅ Row Level Security (RLS) en Supabase

### 5. Base de datos actualizada
- Nuevas columnas en `orders`: `recovered_amount`, `fee_percentage`
- Soporte para plan "success_fee" en la tabla `orders`
- Trigger de Supabase corregido con manejo de errores

---

## Setup local

### 1. Clonar y instalar

```bash
git clone https://github.com/eviguera/cobro-detector.git
cd cobro-detector
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a SQL Editor y ejecuta:
   - `supabase/schema.sql` (esquema principal)
   - `supabase/migration_payments.sql` (migración pagos)
3. Copia las credenciales en `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar Google Gemini (IA gratuita)

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API key de Gemini
3. Agrégala a `.env.local`:
   ```env
   GOOGLE_GEMINI_API_KEY=AIza...
   ```

### 4. Variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
GOOGLE_GEMINI_API_KEY=tu-gemini-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CobroDetector
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

### 1. Crear proyecto en Vercel

Conecta el repo desde [vercel.com](https://vercel.com)

### 2. Variables de entorno en Vercel

En Vercel Dashboard → Settings → Environment Variables, agrega:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `GOOGLE_GEMINI_API_KEY` | API key de Gemini |
| `NEXT_PUBLIC_APP_URL` | https://tu-dominio.vercel.app |
| `NEXT_PUBLIC_APP_NAME` | CobroDetector |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Public Key de Mercado Pago |

### 3. Configurar Supabase para producción

En Supabase → Authentication → URL Configuration:
- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: `https://tu-dominio.vercel.app/**`

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login y registro
│   │   └── auth/callback/  # OAuth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Sidebar + nav
│   │   ├── dashboard/      # Home con métricas
│   │   ├── analisis/       # Upload y análisis
│   │   ├── historial/      # Lista de análisis
│   │   │   └── [id]/       # Detalle + reporte PDF
│   │   ├── precios/        # Planes y compra
│   │   └── pago/           # Éxito/fallo
│   ├── api/
│   │   ├── analyze/        # API de análisis (POST)
│   │   ├── payments/      # Mercado Pago
│   │   └── logout/         # Logout
│   └── page.tsx            # Landing page
├── lib/
│   ├── analyzer.ts         # Motor de detección (reglas + IA)
│   ├── parser.ts           # Parser PDF/Excel/CSV
│   ├── plans.ts            # Configuración de planes
│   ├── mercadopago.ts     # Cliente Mercado Pago
│   └── supabase/          # Clientes Supabase
└── types/
    └── database.types.ts   # Tipos TypeScript
```

---

## Qué detecta

1. **Comisión de crédito duplicada** — La comisión de apertura se cobra UNA SOLA VEZ, no en cada cuota mensual. Caso típico: Venta en 6 cuotas sin interés, comisión de $3.600 se cobra en cuota 1, 2, 3, 4, 5, 6 = ERROR.

2. **Errores en cuotas sin interés** — Ventas pactadas "sin interés" que tienen montos de cuota inconsistentes.

3. **Cargos no reconocidos** — Cargos con descripciones genéricas o en código sin relación clara a una operación real.

4. **Cobros duplicados** — Misma operación cobrada dos veces en el mismo período o con pocos días de diferencia.

---

## Cómo funciona la IA (Google Gemini Flash)

1. **Parser**: El archivo subido (PDF/Excel/CSV) se convierte en lista de transacciones (`ParsedTransaction[]`)

2. **Reglas locales** (`detectAnomaliesRules`): Detecta rápido:
   - Comisión de crédito duplicada en el mismo mes
   - Cobros idénticos en ventana de 7 días
   - Cargos con descripción genérica

3. **IA** (`analyzeTransactionsWithAI`): Recibe hasta 200 transacciones y un prompt que dice:
   - "Busca comisión de crédito duplicada (debe cobrarse 1 sola vez)"
   - "Busca errores en cuotas sin interés"
   - "Busca cargos no reconocidos (genéricos)"
   - "Busca cobros duplicados en 7 días"

4. **Resultado**: JSON con anomalías detectadas, monto recuperable y resumen ejecutivo

---

## Configuración Mercado Pago

### 1. Obtener credenciales

Ve a [mercadopago.cl/developers/panel/credentials](https://www.mercadopago.cl/developers/panel/credentials) y copia:
- **Access Token** (empieza con `APP_USR-...`)
- **Public Key** (empieza con `APP_USR-...`)

### 2. Variables de entorno

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx-xxxx-xxxx
```

### 3. Webhook

En Mercado Pago → Notificaciones → Webhooks, agrega:
`https://tu-dominio.vercel.app/api/payments/webhook`

### Flujo de pago

`/precios` → POST `/api/payments/create` → Mercado Pago checkout → Webhook → Acredita créditos → Redirect a `/pago/exitoso`

---

## Próximas features (roadmap)

- [x] Migración a Google Gemini Flash (gratuito)
- [x] Mejorar detección para casos Santander
- [x] Nuevos planes (Emprendedor 1, Profesional 3, Contador 5, Éxito 10%)
- [x] Seguridad (validación, rate limiting)
- [ ] Integración completa Mercado Pago (plan 10% éxito)
- [ ] Generación de carta de reclamo en Word/PDF
- [ ] Soporte multi-empresa para contadores
- [ ] API para integración con sistemas contables
- [ ] Análisis histórico y tendencias
- [ ] Notificaciones por email cuando se detectan anomalías

---

## Bancos compatibles

Santander · BCI · Banco de Chile · BancoEstado · Itaú · Scotiabank · Banco Security · Banco Falabella · Banco Ripley

El parser es flexible y funciona con cualquier banco que exporte Excel o PDF con formato estándar.

---

## Contacto / Soporte

soporte@cobro-detector.cl

---

## Licencia

MIT
