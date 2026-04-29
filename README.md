# 🛡️ CobroDetector

> Detecta cobros injustificados en estados de cuenta bancarios chilenos usando IA.

**Historia real:** Una carnicería en Rancagua descubrió que el Banco Santander le cobraba la comisión de crédito en cada cuota (debía cobrarse solo una vez). Recuperaron $500.000 CLP. Esta app automatiza ese proceso para todos los emprendedores de Chile.

---

## Stack

- **Frontend/Backend:** Next.js 14 (App Router + Server Actions)
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **IA:** Claude Anthropic (detección de anomalías)
- **Deploy:** Vercel
- **UI:** Tailwind CSS

---

## Modelo de negocio

**Pago único por créditos (no suscripción)**

| Plan | Créditos | Precio | Precio/análisis |
|------|----------|--------|-----------------|
| Emprendedor | 3 | $9.900 CLP | $3.300 |
| Profesional | 10 | $24.900 CLP | $2.490 |
| Contador/Empresa | 30 | $59.900 CLP | $1.997 |

- 1 crédito = 1 análisis completo de estado de cuenta
- **1 análisis gratis** al registrarse
- Los créditos no vencen

---

## Setup local

### 1. Clonar y instalar

```bash
git clone <repo>
cd cobro-detector
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New project
2. En el SQL Editor, ejecuta el contenido de `supabase/schema.sql`
3. Copia las credenciales: Project URL y anon key

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

### 1. Crear proyecto en Vercel

```bash
npm i -g vercel
vercel
```

O conecta el repo desde [vercel.com](https://vercel.com).

### 2. Variables de entorno en Vercel

En Vercel Dashboard → Settings → Environment Variables, agrega las mismas variables de `.env.local.example` con los valores de producción.

Cambia `NEXT_PUBLIC_APP_URL` a tu dominio de Vercel:
```
NEXT_PUBLIC_APP_URL=https://cobro-detector.vercel.app
```

### 3. Configurar Supabase para producción

En Supabase → Authentication → URL Configuration:
- Site URL: `https://tu-dominio.vercel.app`
- Redirect URLs: `https://tu-dominio.vercel.app/auth/callback`

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
│   │   └── precios/        # Planes y compra
│   ├── api/
│   │   ├── analyze/        # API de análisis (POST)
│   │   └── logout/         # Logout
│   └── page.tsx            # Landing page
├── lib/
│   ├── analyzer.ts         # Motor de detección (reglas + IA)
│   ├── parser.ts           # Parser PDF/Excel/CSV
│   ├── plans.ts            # Configuración de planes
│   └── supabase/           # Clientes Supabase
└── types/
    └── database.types.ts   # Tipos TypeScript
```

---

## Qué detecta

1. **Comisión de crédito duplicada** — La comisión de apertura se cobra UNA sola vez, no en cada cuota mensual.
2. **Errores en cuotas sin interés** — Cuotas pactadas sin interés que incluyen intereses o montos inconsistentes.
3. **Cargos no reconocidos** — Cargos con descripción genérica o código que no corresponden a operaciones reales.
4. **Cobros duplicados** — Mismo monto cobrado 2+ veces en ventana de 7 días.

---

## Próximas features (roadmap)

- [ ] Integración Mercado Pago para cobros
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

## Setup Mercado Pago

### 1. Obtener credenciales
Ve a [mercadopago.cl/developers/panel/credentials](https://www.mercadopago.cl/developers/panel/credentials) y copia el **Access Token**.

### 2. Variables de entorno
```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx-xxxx-xxxx
```

### 3. Migración SQL
Ejecuta `supabase/migration_payments.sql` en el SQL Editor de Supabase.

### 4. Webhook
En Mercado Pago > Notificaciones IPN agrega:
`https://tu-dominio.vercel.app/api/payments/webhook` — Evento: Pagos

### 5. Tarjetas de prueba (sandbox)
- Visa aprobada: 4009 1753 3280 6176 / CVV 123 / Vence 11/25
- Rechazada: 4000 0000 0000 0002 / CVV 123 / Vence 11/25

### Flujo completo de pago
/precios → POST /api/payments/create → Mercado Pago checkout
→ Webhook /api/payments/webhook (acredita créditos automáticamente)
→ Redirect a /pago/exitoso o /pago/fallido
