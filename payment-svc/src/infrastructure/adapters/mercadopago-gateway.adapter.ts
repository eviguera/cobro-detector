import crypto from 'node:crypto'
// mercadopago v3: `MercadoPagoConfig` debe importarse como export nombrado.
// El default export ya no es la clase bajo interop CJS/ESM (Node ESM devuelve
// el objeto del módulo), por lo que `new MercadoPagoConfig(...)` fallaba en runtime.
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import type { PaymentGateway, PaymentPreference } from '../../domain/ports/payment-gateway.port'

let mpClient: MercadoPagoConfig | null = null

function getMPClient(): MercadoPagoConfig {
  if (!mpClient) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!token) throw new Error('Missing MERCADOPAGO_ACCESS_TOKEN')
    mpClient = new MercadoPagoConfig({ accessToken: token })
  }
  return mpClient
}

export class MercadoPagoGatewayAdapter implements PaymentGateway {
  async createPreference(params: {
    items: Array<{ id: string; title: string; description: string; quantity: number; unit_price: number }>
    payer: { email: string; name?: string }
    externalReference: string
    metadata: Record<string, unknown>
    backUrls: { success: string; failure: string; pending: string }
    appUrl: string
    statementDescriptor?: string
  }): Promise<PaymentPreference> {
    const client = getMPClient()
    const preference = new Preference(client)

    // HARDENED (2026-11): notification_url apunta al webhook del payment-svc.
    // Usar PAYMENT_SVC_PUBLIC_URL (URL pública accesible por MercadoPago) con
    // fallback a PAYMENT_SERVICE_URL y, por último, a params.appUrl.
    const paymentSvcUrl =
      process.env.PAYMENT_SVC_PUBLIC_URL ??
      process.env.PAYMENT_SERVICE_URL ??
      params.appUrl
    const notificationUrl = `${paymentSvcUrl.replace(/\/$/, '')}/v1/webhook`

    const result = await preference.create({
      body: {
        items: params.items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'CLP',
        })),
        payer: { email: params.payer.email, name: params.payer.name },
        back_urls: {
          success: params.backUrls.success,
          failure: params.backUrls.failure,
          pending: params.backUrls.pending,
        },
        external_reference: params.externalReference,
        notification_url: notificationUrl,
        metadata: params.metadata as Record<string, unknown>,
        auto_return: 'approved',
        statement_descriptor: params.statementDescriptor ?? 'COBRODETECTOR',
      },
    })

    return {
      id: result.id!,
      initPoint: result.init_point!,
      sandboxInitPoint: result.sandbox_init_point!,
    }
  }

  /**
   * HARDENED (2026-11):
   * - `request-id` se toma del HEADER `x-request-id` (MP no lo manda en el body).
   * - Comparación del HMAC con timingSafeEqual (sin timing leaks).
   * - Se rechaza cualquier ts con más de 5 min de diferencia (anti-replay).
   */
  verifyWebhook(signature: string, rawBody: string, requestId?: string): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) throw new Error('Missing MERCADOPAGO_WEBHOOK_SECRET')

    const parts = signature.split(',').map((p) => p.trim())
    const tsPart = parts.find((p) => p.startsWith('ts='))
    const hashPart = parts.find((p) => p.startsWith('v1='))
    if (!tsPart || !hashPart) return false
    const tsValue = tsPart.slice(3)
    const hashValue = hashPart.slice(3)

    // Anti-replay: MP envía ts en segundos UTC; no aceptar mensajes viejos futuros.
    const ts = Number(tsValue)
    const SKEW_SECONDS = 5 * 60
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SKEW_SECONDS) {
      return false
    }

    let dataId = ''
    let bodyRequestId = ''
    try {
      const body = JSON.parse(rawBody)
      dataId = body?.data?.id ?? ''
      bodyRequestId = body?.['request-id'] ?? ''
    } catch {
      return false
    }

    const effectiveRequestId = requestId || bodyRequestId || ''

    const manifest = `id:${dataId};request-id:${effectiveRequestId};ts:${tsValue};`

    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const provided = Buffer.from(hashValue, 'utf8')
    const expected = Buffer.from(hmac, 'utf8')
    if (provided.length !== expected.length) return false
    return crypto.timingSafeEqual(provided, expected)
  }

  async getPaymentStatus(paymentId: string): Promise<{ status: string; statusDetail?: string; externalRef?: string }> {
    const client = getMPClient()
    const paymentClient = new Payment(client)
    const payment = await paymentClient.get({ id: paymentId })
    return {
      status: payment.status ?? 'unknown',
      statusDetail: payment.status_detail,
      externalRef: payment.external_reference,
    }
  }
}
