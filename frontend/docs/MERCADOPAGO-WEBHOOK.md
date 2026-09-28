# Configuración de Webhook de MercadoPago

## Resumen

El webhook de MercadoPago notifica al sistema sobre eventos de pago (aprobado, rechazado, pendiente) para actualizar órdenes y créditos automáticamente.

## Configuración en MercadoPago

### 1. Crear Aplicación

1. Ir a [MercadoPago Developers](https://www.mercadopago.com/developers)
2. Crear una nueva aplicación
3. Seleccionar "Pagos" como producto

### 2. Configurar Webhook

En la configuración de la aplicación:

- **URL del webhook**: `https://payment-svc.vercel.app/v1/webhook`
- **Eventos a suscribirse**:
  - `payment` - Notificaciones de pago
  - `plan` - Notificaciones de planes
  - `subscription` - Notificaciones de suscripciones

### 3. Obtener Credenciales

| Variable | Descripción | Dónde encontrar |
|----------|-------------|-----------------|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de producción | Credenciales de producción |
| `MERCADOPAGO_PUBLIC_KEY` | Key pública para frontend | Credenciales de producción |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret para verificar firmas | Configuración de webhooks |

## Verificación de Firma

El webhook verifica la firma HMAC usando el header `x-signature`:

```typescript
// payment-svc/src/infrastructure/adapters/mercadopago-gateway.adapter.ts
verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  
  const [ts, hash] = signature.split(',').map(s => s.split('=')[1])
  if (!ts || !hash) return false
  
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!
  const manifest = `id:${ts};body:${rawBody}`
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')
  
  return hash === expectedHash
}
```

## Flujo de Procesamiento

```
MercadoPago → POST /v1/webhook
                    │
                    ▼
         Verificar firma HMAC
                    │
                    ▼
         Parsear evento
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
    payment.approved      payment.rejected
         │                     │
         ▼                     ▼
    Actualizar orden    Actualizar orden
    a "paid"            a "failed"
         │
         ▼
    Acreditar créditos
    al usuario
         │
         ▼
    Enviar notificación
    (notification-svc)
```

## Eventos Soportados

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `payment.approved` | Pago aprobado | Acreditar créditos |
| `payment.rejected` | Pago rechazado | Marcar orden como fallida |
| `payment.pending` | Pago pendiente | Marcar orden como pendiente |
| `payment.refunded` | Pago reembolsado | Descontar créditos |

## Variables de Entorno Requeridas

```bash
# payment-svc
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxxx
```

## Pruebas

### Webhook de prueba

```bash
curl -X POST https://payment-svc.vercel.app/v1/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=1234567890,v1=abc123..." \
  -d '{
    "action": "payment.created",
    "data": {
      "id": "123456789"
    }
  }'
```

### Tarjetas de Prueba

| Tarjeta | Número | Resultado |
|---------|--------|-----------|
| Visa | 4111 1111 1111 1111 | Aprobado |
| Mastercard | 5555 5555 5555 4444 | Aprobado |
| Amex | 3782 8224 6310 005 | Rechazado |

## Troubleshooting

### Error: "Invalid signature"

- Verificar que `MERCADOPAGO_WEBHOOK_SECRET` sea correcto
- Verificar que el body del webhook no sea modificado por middleware

### Error: "Webhook not received"

- Verificar que la URL del webhook sea accesible públicamente
- Verificar que el servicio esté corriendo
- Revisar logs de Vercel para errores

### Los créditos no se acreditan

- Verificar que el webhook esté procesando el evento `payment.approved`
- Verificar que la orden exista en la base de datos
- Verificar que el pago esté confirmado en MercadoPago
