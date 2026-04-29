import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

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

export { Preference, Payment }
