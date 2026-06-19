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

  verifyWebhook(signature: string, body: string): boolean

  getPaymentStatus(paymentId: string): Promise<{ status: string; statusDetail?: string; externalRef?: string }>
}
