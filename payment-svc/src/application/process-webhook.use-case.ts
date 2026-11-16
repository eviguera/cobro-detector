import type { PaymentGateway } from '../domain/ports/payment-gateway.port'
import type { OrderRepository } from '../domain/ports/order-repository.port'
import type { CreditRepository } from '../domain/ports/credit.repository.port'
import type { AnalysisRepository } from '../domain/ports/analysis-repository.port'
import type { PaymentEventRepository } from '../domain/ports/payment-event-repository.port'

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
    private analysisRepo: AnalysisRepository,
    private paymentEventRepo: PaymentEventRepository
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

    // HARDENED (2026-11): dedup durable por mp_payment_id. Si este pago ya
    // aplicó su efecto (orden acreditada o reporte liberado), respondemos
    // duplicado sin gastar la llamada a getPaymentStatus ni re-correr la
    // lógica de negocio. La tabla payment_events solo se escribe tras el
    // efecto aplicado, así que un pago en curso nunca aparece acá.
    if (await this.paymentEventRepo.isProcessed(String(paymentId))) {
      return { received: true, duplicate: true }
    }

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
      // HARDENED (2026-11): markCompleted es un CAS sobre 'awaiting_payment'.
      // Si no aplicó, el análisis ya cambió de estado (otro webhook lo
      // completó o nunca estuvo pendiente de pago) y este pago no libera
      // nada: no se registra el evento y respondemos 200 (reintentar no
      // cambiaría el resultado).
      const applied = await this.analysisRepo.markCompleted(analysisId)
      if (!applied) {
        return { received: true, unlock: false, analysisId }
      }
      // El evento se registra SOLO tras el efecto aplicado. Si este insert
      // falla, la excepción sube (5xx) y MercadoPago reintenta: el CAS del
      // reintento devolverá false y no habrá doble desbloqueo.
      await this.paymentEventRepo.record(String(paymentId), 'unlock', undefined, analysisId)
      return { received: true, unlock: true, analysisId }
    }

    if (!this.uuidRegex.test(externalRef)) throw new Error('externalRef inválido')

    const order = await this.orderRepo.findByExternalRef(externalRef)
    if (order) {
      const paidHandled = await this.handleOrder(order, paymentId, paymentStatus.status, paymentStatus.statusDetail)
      if (paidHandled) {
        // Camino exitoso de orden pagada (la RPC no lanzó): registramos el
        // pago para que los reenvíos de MercadoPago se corten arriba. Si la
        // acreditación lanzó, nunca llegamos acá y MercadoPago reintenta.
        await this.paymentEventRepo.record(String(paymentId), 'payment', order.id, undefined)
      }
    }

    return { received: true, status: paymentStatus.status }
  }

  /**
   * Aplica la transición de la orden según el estado del pago. Devuelve
   * true cuando el pago era 'approved' y se procesó el camino de orden
   * pagada sin error (la acreditación aplicó, o perdió el CAS contra otro
   * webhook del mismo pago: en ambos casos la orden quedó 'paid' de forma
   * terminal). Devuelve false para estados no aprobados o cuando la orden
   * ya estaba pagada al leerla.
   */
  private async handleOrder(
    order: { id: string; user_id: string; credits_purchased: number; status: string; plan: string },
    paymentId: string,
    status: string | undefined,
    statusDetail: string | undefined
  ): Promise<boolean> {
    const orderStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending'

    // Solo 'paid' es terminal. Antes también se descartaba 'failed', así que un
    // segundo intento aprobado sobre la misma preferencia cobraba sin acreditar.
    if (order.status === 'paid') {
      return false
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
      return true
    }

    // Estados no aprobados: no hay créditos que acreditar, basta el CAS.
    await this.orderRepo.updateStatus(order.id, {
      status: orderStatus,
      mp_payment_id: String(paymentId),
      mp_status: status ?? null,
      mp_detail: statusDetail ?? null,
    }, order.status)
    return false
  }
}
