import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentEventRepository } from '../../domain/ports/payment-event-repository.port'

export class SupabasePaymentEventRepositoryAdapter implements PaymentEventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async record(
    mpPaymentId: string,
    eventType: string,
    orderId?: string,
    analysisId?: string,
    payload?: Record<string, unknown>
  ): Promise<boolean> {
    // INSERT ... ON CONFLICT (mp_payment_id) DO NOTHING en la base: dos
    // webhooks concurrentes del mismo pago insertan a lo sumo un evento.
    const { data: inserted, error } = await this.supabase.rpc('record_payment_event', {
      p_mp_payment_id: mpPaymentId,
      p_event_type: eventType,
      p_order_id: orderId ?? null,
      p_analysis_id: analysisId ?? null,
      p_payload: payload ?? null,
    })

    if (error) throw new Error(`Error recording payment event: ${error.message}`)
    return inserted === true
  }

  async isProcessed(mpPaymentId: string): Promise<boolean> {
    const { data: processed, error } = await this.supabase.rpc('is_payment_event_processed', {
      p_mp_payment_id: mpPaymentId,
    })

    if (error) throw new Error(`Error checking payment event: ${error.message}`)
    return processed === true
  }
}
