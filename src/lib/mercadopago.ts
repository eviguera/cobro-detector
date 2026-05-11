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
