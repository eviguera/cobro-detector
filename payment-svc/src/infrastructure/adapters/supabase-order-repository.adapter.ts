import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order } from '../../domain/order.entity'
import type { OrderRepository } from '../../domain/ports/order-repository.port'

export class SupabaseOrderRepositoryAdapter implements OrderRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: {
    user_id: string
    plan: string
    credits_purchased: number
    amount_clp: number
    status: string
    payment_provider: string
    fee_percentage?: number
  }): Promise<Order> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .insert(data as Record<string, unknown>)
      .select()
      .single()

    if (error || !order) throw new Error(`Error creating order: ${error?.message ?? 'unknown'}`)
    return order as unknown as Order
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data as unknown as Order
  }

  async findByExternalRef(id: string): Promise<Pick<Order, 'id' | 'user_id' | 'credits_purchased' | 'status' | 'plan'> | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('id, user_id, credits_purchased, status, plan')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data as unknown as Pick<Order, 'id' | 'user_id' | 'credits_purchased' | 'status' | 'plan'>
  }

  async updateStatus(id: string, updateData: {
    status?: string
    mp_payment_id?: string
    mp_status?: string | null
    mp_detail?: string | null
    success_plan_active?: boolean
    mp_preference_id?: string
  }, expectedStatus?: string): Promise<boolean> {
    let query = this.supabase
      .from('orders')
      .update(updateData as Record<string, unknown>)
      .eq('id', id)

    // Compare-and-swap: solo aplica si la orden sigue en el estado leído.
    // Sin esto, dos webhooks concurrentes de MercadoPago acreditaban dos veces.
    if (expectedStatus !== undefined) {
      query = query.eq('status', expectedStatus)
    }

    const { data, error } = await query.select('id')

    if (error) throw new Error(`Error updating order: ${error.message}`)
    if (expectedStatus === undefined) return true
    return Array.isArray(data) && data.length > 0
  }

  async confirmPaid(orderId: string, data: {
    mpPaymentId: string
    mpStatus: string | null
    mpDetail: string | null
  }, expectedStatus: string): Promise<boolean> {
    // CAS de la orden + acreditación de créditos en una sola transacción.
    // Si la RPC falla, la orden NO queda 'paid' y el webhook puede reintentarse.
    const { data: applied, error } = await this.supabase.rpc('confirm_order_paid', {
      p_order_id: orderId,
      p_mp_payment_id: data.mpPaymentId,
      p_mp_status: data.mpStatus,
      p_mp_detail: data.mpDetail,
      p_expected_status: expectedStatus,
    })

    if (error) throw new Error(`Error confirming payment: ${error.message}`)
    return applied === true
  }
}
