import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import { PLANS } from '../domain/plan.entity.js'

export class CreatePaymentUseCase {
  constructor(
    private paymentGateway: PaymentGateway,
    private orderRepo: OrderRepository,
    private creditRepo: CreditRepository
  ) {}

  async execute(params: {
    userId: string
    userEmail: string
    userName: string | null
    planKey: string
    appUrl: string
  }) {
    const plan = PLANS[params.planKey]
    if (!plan) throw new Error('Plan inválido')

    const order = await this.orderRepo.create({
      user_id: params.userId,
      plan: params.planKey,
      credits_purchased: plan.credits,
      amount_clp: plan.priceClp,
      status: 'pending',
      payment_provider: params.planKey === 'platino' ? 'success_fee' : 'mercadopago',
      ...(params.planKey === 'platino' ? { fee_percentage: (plan.successFee ?? 0.2) * 100 } : {}),
    })

    if (params.planKey === 'platino') {
      return { order, message: 'Plan de éxito activado. Se cobrará el 20% de lo recuperado.' }
    }

    const { initPoint, sandboxInitPoint } = await this.paymentGateway.createPreference({
      items: [{
        id: params.planKey,
        title: `CobroDetector · Plan ${plan.name}`,
        description: `${plan.credits} créditos de análisis de estado de cuenta`,
        quantity: 1,
        unit_price: plan.priceClp,
      }],
      payer: { email: params.userEmail, name: params.userName ?? '' },
      backUrls: {
        success: `${params.appUrl}/pago/exitoso?order=${order.id}`,
        failure: `${params.appUrl}/pago/fallido?order=${order.id}`,
        pending: `${params.appUrl}/pago/exitoso?order=${order.id}&pending=true`,
      },
      externalReference: order.id,
      metadata: { order_id: order.id, user_id: params.userId, plan_key: params.planKey, credits: plan.credits },
      appUrl: params.appUrl,
    })

    await this.orderRepo.updateStatus(order.id, { mp_preference_id: initPoint === sandboxInitPoint ? undefined : initPoint })

    return { orderId: order.id, preferenceId: initPoint === sandboxInitPoint ? initPoint : initPoint, initPoint, sandboxInitPoint }
  }
}

export class CreateUnlockPaymentUseCase {
  constructor(
    private paymentGateway: PaymentGateway
  ) {}

  async execute(params: {
    userId: string
    userEmail: string
    userName: string | null
    analysisId: string
    analysisFileName: string
    recoverableAmount: number
    appUrl: string
  }) {
    const amount = Math.round(params.recoverableAmount * 0.2)
    if (amount <= 0) return { unlocked: true }

    const externalRef = `unlock_${params.analysisId}`

    const { initPoint, sandboxInitPoint } = await this.paymentGateway.createPreference({
      items: [{
        id: 'unlock-report',
        title: 'CobroDetector · Desbloquear Reporte (Plan Platino)',
        description: `20% de $${params.recoverableAmount.toLocaleString('es-CL')} recuperado — ${params.analysisFileName}`,
        quantity: 1,
        unit_price: amount,
      }],
      payer: { email: params.userEmail, name: params.userName ?? '' },
      backUrls: {
        success: `${params.appUrl}/historial/${params.analysisId}`,
        failure: `${params.appUrl}/historial/${params.analysisId}`,
        pending: `${params.appUrl}/historial/${params.analysisId}`,
      },
      externalReference: externalRef,
      metadata: { analysis_id: params.analysisId, user_id: params.userId, type: 'unlock_report' },
      appUrl: params.appUrl,
    })

    return { initPoint, sandboxInitPoint, amount }
  }
}
