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

  async addCredits(userId: string, amount: number): Promise<void> {
    // Acreditación atómica en base (total = total + amount) con lock por
    // usuario. Antes era read-modify-write: dos acreditaciones concurrentes
    // se pisaban y el usuario pagaba sin recibir créditos.
    const { error } = await this.supabaseService.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
    })

    if (error) throw new Error(`Error adding credits: ${error.message}`)
  }
}
