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
    status: string
    mp_payment_id?: string
    mp_status?: string | null
    mp_detail?: string | null
    success_plan_active?: boolean
    mp_preference_id?: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update(updateData as Record<string, unknown>)
      .eq('id', id)

    if (error) throw new Error(`Error updating order: ${error.message}`)
  }
}
