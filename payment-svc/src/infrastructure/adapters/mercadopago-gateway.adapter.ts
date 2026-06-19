import crypto from 'node:crypto'
import MercadoPagoConfig, { Payment, Preference } from 'mercadopago'
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

  verifyWebhook(signature: string, rawBody: string): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) throw new Error('Missing MERCADOPAGO_WEBHOOK_SECRET')

    const [ts, hash] = signature.split(',')
    const tsValue = ts.replace('ts=', '')
    const hashValue = hash.replace('v1=', '')

    const body = JSON.parse(rawBody)
    const dataId = body?.data?.id ?? ''
    const webhookId = body?.['request-id'] ?? ''

    const manifest = `id:${dataId};request-id:${webhookId};ts:${tsValue};`

    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return hmac === hashValue
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
