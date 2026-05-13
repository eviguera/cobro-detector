import { MercadoPagoConfig, Preference, Payment, CardToken, Customer } from 'mercadopago'

// Cliente MP configurado con el access token
export function getMPClient() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
  }
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 },
  })
}

export { Preference, Payment, CardToken, Customer }

export async function createPaymentPreference(params: {
  items: Array<{ id: string; title: string; description: string; quantity: number; unit_price: number }>
  payer: { email: string; name?: string }
  externalReference: string
  metadata: Record<string, unknown>
  backUrls: { success: string; failure: string; pending: string }
  appUrl: string
  statementDescriptor?: string
}) {
  const mpClient = getMPClient()
  const preference = new Preference(mpClient)

  const preferenceData = await preference.create({
    body: {
      items: params.items.map(item => ({
        ...item,
        currency_id: 'CLP',
      })),
      payer: {
        email: params.payer.email,
        name: params.payer.name ?? '',
      },
      back_urls: params.backUrls,
      auto_return: 'approved',
      external_reference: params.externalReference,
      notification_url: `${params.appUrl}/api/payments/webhook`,
      statement_descriptor: params.statementDescriptor ?? 'COBRO DETECTOR',
      metadata: params.metadata,
    },
  })

  return {
    initPoint: preferenceData.init_point,
    sandboxInitPoint: preferenceData.sandbox_init_point,
    preferenceId: preferenceData.id,
  }
}

// Función para cobrar con tarjeta tokenizada (plan de éxito)
export async function chargeSuccessFee(
  cardToken: string,
  amount: number,
  description: string,
  externalReference: string,
  payerEmail: string,
  paymentMethodId?: string,
) {
  const mpClient = getMPClient()
  const paymentClient = new Payment(mpClient)

  const payment = await paymentClient.create({
    body: {
      token: cardToken,
      installments: 1,
      transaction_amount: amount,
      description,
      payment_method_id: paymentMethodId,
      payer: {
        email: payerEmail,
      },
      external_reference: externalReference,
      statement_descriptor: 'COBRO DETECTOR',
    }
  })

  return payment
}
