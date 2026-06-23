import { createPaymentPreference, createUnlockPayment } from '@/infrastructure/http/payment-api'
import type { PaymentPreference } from '@/domain'

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

export async function buyPlan(params: CreatePaymentParams): Promise<PaymentPreference> {
  return createPaymentPreference(params)
}

export async function unlockReport(params: UnlockPaymentParams): Promise<PaymentPreference> {
  return createUnlockPayment(params)
}
