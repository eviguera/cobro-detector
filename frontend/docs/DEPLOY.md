# Guía de Deploy - CobroDetector

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Frontend (Next.js)                                  │   │
│  │  - Landing, Dashboard, Análisis, Pagos              │   │
│  │  - Supabase Auth + Storage                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Microservicios (Vercel Serverless)                  │   │
│  │  - analysis-svc  (puerto 3001)                     │   │
│  │  - payment-svc   (puerto 3002)                     │   │
│  │  - notification-svc (puerto 3003)                   │   │
│  │  - api-svc       (puerto 3004)                     │   │
│  │  - admin-svc     (puerto 3005)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase                                │
│  - PostgreSQL (datos)                                       │
│  - Auth (usuarios)                                          │
│  - Storage (archivos)                                       │
└─────────────────────────────────────────────────────────────┘
```

## Variables de Entorno en Vercel

### Frontend (Next.js)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key anónima de Supabase | `eyJhbGci...` |
| `NEXT_PUBLIC_APP_URL` | URL de la app | `https://cobrodetector.vercel.app` |
| `NEXT_PUBLIC_ANALYSIS_SVC_URL` | URL del servicio de análisis | `https://analysis-svc.vercel.app` |
| `NEXT_PUBLIC_PAYMENT_SVC_URL` | URL del servicio de pagos | `https://payment-svc.vercel.app` |
| `NEXT_PUBLIC_AUTH_API_URL` | URL del servicio de auth | `https://api-svc.vercel.app` |
| `NEXT_PUBLIC_ADMIN_SVC_URL` | URL del servicio admin | `https://admin-svc.vercel.app` |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Key pública de MercadoPago | `APP_USR-xxx` |

### Microservicios

| Variable | Descripción | Usado por |
|----------|-------------|-----------|
| `SUPABASE_URL` | URL de Supabase | Todos |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Todos |
| `PORT` | Puerto del servicio | Todos |
| `GROQ_API_KEY` | API key de Groq | analysis-svc |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago | payment-svc |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret del webhook | payment-svc |
| `RESEND_API_KEY` | API key de Resend | notification-svc |

## Deploy en Vercel

### 1. Frontend

```bash
# Desde el directorio frontend/
vercel --prod
```

### 2. Microservicios

Cada microservicio necesita su propio `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

### 3. Configurar variables en Vercel

```bash
# Frontend
vercel env add NEXT_PUBLIC_ANALYSIS_SVC_URL
vercel env add NEXT_PUBLIC_PAYMENT_SVC_URL
vercel env add NEXT_PUBLIC_AUTH_API_URL
vercel env add NEXT_PUBLIC_ADMIN_SVC_URL

# Microservicios
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GROQ_API_KEY
vercel env add MERCADOPAGO_ACCESS_TOKEN
vercel env add MERCADOPAGO_WEBHOOK_SECRET
vercel env add RESEND_API_KEY
```

## Webhook de MercadoPago

### Configuración

1. Ir a [MercadoPago Developers](https://www.mercadopago.com/developers)
2. Crear una aplicación
3. Configurar el webhook URL: `https://payment-svc.vercel.app/v1/webhook`
4. Copiar el `MERCADOPAGO_WEBHOOK_SECRET`

### Eventos a suscribirse

- `payment` - Notificaciones de pago
- `plan` - Notificaciones de planes
- `subscription` - Notificaciones de suscripciones

## Verificación Post-Deploy

### 1. Health Checks

```bash
curl https://analysis-svc.vercel.app/health
curl https://payment-svc.vercel.app/health
curl https://api-svc.vercel.app/health
curl https://admin-svc.vercel.app/health
curl https://notification-svc.vercel.app/health
```

### 2. Tests E2E

```bash
cd frontend
TEST_EMAIL=test-e2e@cobrodetector.com TEST_PASSWORD=Test1234! npm run test:e2e
```

### 3. QA Check

```bash
cd frontend
npx ts-node scripts/qa-check.ts
```

## Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

- Verificar que las variables de entorno estén configuradas en Vercel
- Verificar que el servicio tenga acceso a las variables

### Error: "CORS policy"

- Verificar que el frontend tenga la URL correcta del microservicio
- Verificar que el microservicio permita CORS del dominio del frontend

### Error: "MercadoPago webhook verification failed"

- Verificar que `MERCADOPAGO_WEBHOOK_SECRET` sea correcto
- Verificar que el webhook esté configurado en MercadoPago
