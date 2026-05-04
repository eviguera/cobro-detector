# Cómo configurar MercadoPago

## Variables ya configuradas en Vercel ✅
- `MERCADOPAGO_ACCESS_TOKEN` ✅ (ya existe)
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` ✅ (ya existe)

## Falta configurar ⚠️
- `MERCADOPAGO_WEBHOOK_SECRET` - Necesario para validar webhooks

## Pasos para obtener el Webhook Secret

1. **Accede a MercadoPago Developers:**
   https://www.mercadopago.com.pe/developers/panel/app

2. **Selecciona tu aplicación** (o crea una nueva)

3. **Ve a "Credenciales"** → "Webhook Secret"

4. **Copia el valor** y ejecuta en terminal:
```bash
cd /Users/eduardoviguera/Desktop/COBRO/cobro-detector
npx vercel env add MERCADOPAGO_WEBHOOK_SECRET production
# Pega el valor que copiaste
```

## O alternativamente, si no tienes el secret:

1. En el panel de MercadoPago, ve a **"Webhooks"**
2. Crea un nuevo webhook:
   - URL: `https://project-qtyiz.vercel.app/api/payments/webhook`
   - Events: Selecciona `payment`
3. MercadoPago te generará un **"Webhook Secret"**

## Verificar configuración
```bash
npx vercel env ls | grep MERCADO
```

## Nota
Sin el `MERCADOPAGO_WEBHOOK_SECRET`, los pagos se procesarán pero no se validará la firma del webhook (menos seguro pero funcional).
