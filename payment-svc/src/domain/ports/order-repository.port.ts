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

  updateStatus(id: string, data: {
    status?: string
    mp_payment_id?: string
    mp_status?: string | null
    mp_detail?: string | null
    success_plan_active?: boolean
    mp_preference_id?: string
  }): Promise<void>
}
