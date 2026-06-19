import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'

interface SuccessChargeRow {
  id: string
  user_id: string
  charge_amount: number
}

export class ProcessWebhookUseCase {
  private uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  constructor(
    private paymentGateway: PaymentGateway,
    private orderRepo: OrderRepository,
    private creditRepo: CreditRepository
  ) {}

  async execute(rawBody: string, signature: string | null) {
    if (!signature) throw new Error('Falta firma')

    const isValid = this.paymentGateway.verifyWebhook(signature, rawBody)
    if (!isValid) throw new Error('Firma inválida')

    const body = JSON.parse(rawBody)
    const { type, data } = body

    if (type !== 'payment') return { received: true }

    const paymentId = data?.id
    if (!paymentId) throw new Error('Payment ID faltante')

    const paymentStatus = await this.paymentGateway.getPaymentStatus(paymentId)
    const externalRef = paymentStatus.externalRef
    if (!externalRef) throw new Error('Sin referencia externa')

    if (externalRef.startsWith('unlock_')) {
      return { received: true, unlock: true }
    }

    if (!this.uuidRegex.test(externalRef)) throw new Error('externalRef inválido')

    const order = await this.orderRepo.findByExternalRef(externalRef)
    if (order) {
      await this.handleOrder(order, paymentId, paymentStatus.status, paymentStatus.statusDetail)
    }

    return { received: true, status: paymentStatus.status }
  }

  private async handleOrder(
    order: { id: string; user_id: string; credits_purchased: number; status: string; plan: string },
    paymentId: string,
    status: string | undefined,
    statusDetail: string | undefined
  ) {
    const orderStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending'

    await this.orderRepo.updateStatus(order.id, {
      status: orderStatus,
      mp_payment_id: String(paymentId),
      mp_status: status ?? null,
      mp_detail: statusDetail ?? null,
    })

    if (status === 'approved' && order.status !== 'paid') {
      await this.creditRepo.addCredits(order.user_id, order.credits_purchased)
    }
  }
}
