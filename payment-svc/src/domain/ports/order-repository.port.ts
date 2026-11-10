import type { Order } from '../order.entity'

export interface OrderRepository {
  create(data: {
    user_id: string
    plan: string
    credits_purchased: number
    amount_clp: number
    status: string
    payment_provider: string
    fee_percentage?: number
  }): Promise<Order>

  findById(id: string): Promise<Order | null>

  findByExternalRef(id: string): Promise<Pick<Order, 'id' | 'user_id' | 'credits_purchased' | 'status' | 'plan'> | null>

  /**
   * Actualiza la orden. Si se pasa `expectedStatus`, el UPDATE es un
   * compare-and-swap atómico (solo aplica si la orden sigue en ese estado) y
   * devuelve false cuando otro webhook ya la procesó.
   */
  updateStatus(id: string, data: {
    status?: string
    mp_payment_id?: string
    mp_status?: string | null
    mp_detail?: string | null
    success_plan_active?: boolean
    mp_preference_id?: string
  }, expectedStatus?: string): Promise<boolean>

  /**
   * Marca la orden como pagada y acredita los créditos en una sola transacción
   * (RPC `confirm_order_paid`). Devuelve false si la orden ya no estaba en
   * `expectedStatus` (otro webhook ganó). Si la acreditación falla, la orden no
   * queda 'paid': el webhook responde 5xx y MercadoPago reintenta.
   */
  confirmPaid(orderId: string, data: {
    mpPaymentId: string
    mpStatus: string | null
    mpDetail: string | null
  }, expectedStatus: string): Promise<boolean>
}
