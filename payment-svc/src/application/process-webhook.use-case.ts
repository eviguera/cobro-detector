import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'
import type { AnalysisRepository } from '../domain/ports/analysis-repository.port'

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
    private creditRepo: CreditRepository,
    private analysisRepo: AnalysisRepository
  ) {}

  async execute(rawBody: string, signature: string | null, requestId?: string) {
    if (!signature) throw new Error('Falta firma')

    const isValid = this.paymentGateway.verifyWebhook(signature, rawBody, requestId)
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
      // Solo un pago APROBADO libera el reporte: MercadoPago también notifica
      // pending/rejected, y antes cualquiera de esos eventos desbloqueaba.
      if (paymentStatus.status !== 'approved') {
        return { received: true, unlock: false, status: paymentStatus.status }
      }
      const analysisId = externalRef.slice('unlock_'.length)
      if (!this.uuidRegex.test(analysisId)) throw new Error('externalRef inválido')
      await this.analysisRepo.markCompleted(analysisId)
      return { received: true, unlock: true, analysisId }
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

    // Solo 'paid' es terminal. Antes también se descartaba 'failed', así que un
    // segundo intento aprobado sobre la misma preferencia cobraba sin acreditar.
    if (order.status === 'paid') {
      return
    }

    if (status === 'approved') {
      // Cas atómico: la orden pasa a 'paid' y los créditos se acreditan en la
      // misma transacción. Si la acreditación falla, la excepción sube y la
      // orden NO queda 'paid' (MercadoPago reintenta).
      await this.orderRepo.confirmPaid(order.id, {
        mpPaymentId: String(paymentId),
        mpStatus: status,
        mpDetail: statusDetail ?? null,
      }, order.status)
      return
    }

    // Estados no aprobados: no hay créditos que acreditar, basta el CAS.
    await this.orderRepo.updateStatus(order.id, {
      status: orderStatus,
      mp_payment_id: String(paymentId),
      mp_status: status ?? null,
      mp_detail: statusDetail ?? null,
    }, order.status)
  }
}
