# Deploy de Microservicios

## Opciones de Deploy

### 1. Docker Compose (Desarrollo Local)

```bash
# Clonar repositorio
git clone <repo-url>
cd cobro-detector

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales correctas

# Levantar todos los servicios
docker-compose up -d

# Verificar que estén corriendo
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 2. Vercel (Producción)

Cada microservicio se despliega como un serverless function en Vercel.

#### Estructura de Proyecto en Vercel

```
cobro-detector/
├── frontend/          # Next.js app (Vercel)
├── analysis-svc/      # Serverless function
├── payment-svc/       # Serverless function
├── api-svc/           # Serverless function
├── admin-svc/         # Serverless function
└── notification-svc/  # Serverless function
```

#### Configuración por Servicio

##### analysis-svc

```json
// analysis-svc/vercel.json
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

##### payment-svc

```json
// payment-svc/vercel.json
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

##### api-svc

```json
// api-svc/vercel.json
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

##### admin-svc

```json
// admin-svc/vercel.json
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

##### notification-svc

```json
// notification-svc/vercel.json
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

### 3. Railway/Render (Alternativa)

Cada servicio puede desplegarse en Railway o Render como un servicio web.

#### Railway

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway init

# Desplegar cada servicio
cd analysis-svc && railway up
cd ../payment-svc && railway up
cd ../api-svc && railway up
cd ../admin-svc && railway up
cd ../notification-svc && railway up
```

## Variables de Entorno

### Variables Comunes (Todos los servicios)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `eyJhbGci...` |
| `PORT` | Puerto del servicio | `3001` |

### Variables Específicas

#### analysis-svc

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GROQ_API_KEY` | API key de Groq | `gsk_xxx` |

#### payment-svc

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de MercadoPago | `APP_USR-xxx` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret del webhook | `xxx` |

#### notification-svc

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key de Resend | `re_xxx` |
| `FROM_EMAIL` | Email remitente | `notificaciones@cobrodetector.cl` |

## Health Checks

Todos los servicios exponen un endpoint `/health`:

```bash
curl http://localhost:3001/health  # analysis-svc
curl http://localhost:3002/health  # payment-svc
curl http://localhost:3003/health  # notification-svc
curl http://localhost:3004/health  # api-svc
curl http://localhost:3005/health  # admin-svc
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "analysis-svc",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Monitoreo

### Logs

```bash
# Docker Compose
docker-compose logs -f <service>

# Vercel
vercel logs <deployment-url>

# Railway
railway logs
```

### Métricas

- **Vercel**: Dashboard de Vercel muestra métricas de invocaciones, latencia, errores
- **Railway**: Dashboard de Railway muestra métricas de CPU, memoria, red
- **Render**: Dashboard de Render muestra métricas similares

## Escalabilidad

### Vercel (Serverless)

- Escala automáticamente según demana
- Sin servidores que gestionar
- Pago por invocación

### Docker Compose (VPS)

- Escalar manualmente con `docker-compose up --scale <service>=<n>`
- Requiere load balancer para múltiples instancias
- Monitoreo manual necesario

## Troubleshooting

### Error: "Missing SUPABASE_URL"

```bash
# Verificar variables de entorno
docker-compose config

# Verificar que .env existe y tiene las variables
cat .env | grep SUPABASE
```

### Error: "Connection refused"

```bash
# Verificar que el servicio esté corriendo
docker-compose ps

# Ver logs del servicio
docker-compose logs <service>
```

### Error: "Health check failed"

```bash
# Verificar conectividad con Supabase
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" $SUPABASE_URL/rest/v1/

# Verificar que el puerto esté abierto
netstat -tlnp | grep <port>
```

## Checklist Pre-Deploy

- [ ] Variables de entorno configuradas
- [ ] Credenciales de Supabase válidas
- [ ] API keys de terceros configuradas (Groq, MercadoPago, Resend)
- [ ] Webhook de MercadoPago configurado
- [ ] Tests pasando (`npm test` en cada servicio)
- [ ] Health checks respondiendo correctamente
- [ ] Logs sin errores críticos
