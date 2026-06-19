import type { SupabaseClient } from '@supabase/supabase-js'
import type { Credit } from '../../domain/credit.entity'
import type { CreditRepository } from '../../domain/ports/credit.repository.port'

export class SupabaseCreditRepositoryAdapter implements CreditRepository {
  constructor(private readonly supabaseService: SupabaseClient) {}

  async getCredits(userId: string): Promise<Credit | null> {
    const { data, error } = await this.supabaseService
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return data as unknown as Credit
  }

  async consumeAtomic(userId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService.rpc('consume_credit', { p_user_id: userId })
    if (error) return false
    return data as boolean
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    const { data: existing } = await this.supabaseService
      .from('credits')
      .select('total, used')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await this.supabaseService
        .from('credits')
        .update({ total: (existing.total as number) + amount })
        .eq('user_id', userId)
    } else {
      await this.supabaseService
        .from('credits')
        .insert({ user_id: userId, total: amount, used: 0 })
    }
  }
}
