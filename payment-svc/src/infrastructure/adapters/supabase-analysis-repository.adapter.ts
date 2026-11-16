import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisRepository } from '../../domain/ports/analysis-repository.port'

export class SupabaseAnalysisRepositoryAdapter implements AnalysisRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async markCompleted(analysisId: string): Promise<boolean> {
    // HARDENED (2026-11): compare-and-swap — solo un análisis en
    // 'awaiting_payment' pasa a 'completed'. El UPDATE anterior era
    // incondicional: un webhook duplicado (o un unlock pagado sobre un
    // análisis en otro estado) pisaba el estado actual sin dejar rastro.
    // Devuelve false cuando ninguna fila coincidió con el estado esperado.
    const { data, error } = await this.supabase
      .from('analyses')
      .update({ status: 'completed' })
      .eq('id', analysisId)
      .eq('status', 'awaiting_payment')
      .select('id')

    if (error) throw new Error(`Error marking analysis completed: ${error.message}`)
    return Array.isArray(data) && data.length > 0
  }
}
