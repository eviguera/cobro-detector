import { apiFetch, services } from './client'
import type { PaymentPreference, Order } from '@/domain'

interface CreatePaymentParams {
  userId: string
  userEmail: string
  userName: string | null
  planKey: string
  appUrl: string
}

interface UnlockPaymentParams {
  userId: string
  userEmail: string
  userName: string | null
  analysisId: string
  analysisFileName: string
  recoverableAmount: number
  appUrl: string
}

export function createPaymentPreference(params: CreatePaymentParams): Promise<PaymentPreference> {
  return apiFetch<PaymentPreference>(
    services.payment.baseUrl,
    '/v1/preferences',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  )
}

export function createUnlockPayment(params: UnlockPaymentParams): Promise<PaymentPreference> {
  return apiFetch<PaymentPreference>(
    services.payment.baseUrl,
    '/v1/unlock',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  )
}

export function getOrder(id: string): Promise<Order> {
  return apiFetch<Order>(
    services.payment.baseUrl,
    `/v1/orders/${id}`,
  )
}
