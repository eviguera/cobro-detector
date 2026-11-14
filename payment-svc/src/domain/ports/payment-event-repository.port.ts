export interface PaymentEventRepository {
  /**
   * Registra el evento de pago de forma atómica (RPC `record_payment_event`).
   * Devuelve true si insertó (primera vez que este pago aplica su efecto) o
   * false si ya existía (webhook duplicado / carrera entre entregas).
   */
  record(
    mpPaymentId: string,
    eventType: string,
    orderId?: string,
    analysisId?: string,
    payload?: Record<string, unknown>
  ): Promise<boolean>

  /**
   * ¿Ya se procesó este pago? (RPC `is_payment_event_processed`). Consulta
   * de dedup antes de llamar a la API de MercadoPago.
   */
  isProcessed(mpPaymentId: string): Promise<boolean>
}
