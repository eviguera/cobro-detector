export interface PaymentPreference {
  id: string
  initPoint: string
  sandboxInitPoint?: string
}

export interface PaymentGateway {
  createPreference(params: {
    items: Array<{ id: string; title: string; description: string; quantity: number; unit_price: number }>
    payer: { email: string; name?: string }
    externalReference: string
    metadata: Record<string, unknown>
    backUrls: { success: string; failure: string; pending: string }
    appUrl: string
    statementDescriptor?: string
  }): Promise<PaymentPreference>

  /**
 * Verifica la firma del webhook de MercadoPago.
 * `signature` es el header `x-signature` ("ts=<ts>,v1=<hmac>") y `requestId`
 * el header `x-request-id` (MP lo envía como header, NO en el body).
 */
verifyWebhook(signature: string, body: string, requestId?: string): boolean

  getPaymentStatus(paymentId: string): Promise<{ status: string; statusDetail?: string; externalRef?: string }>
}
