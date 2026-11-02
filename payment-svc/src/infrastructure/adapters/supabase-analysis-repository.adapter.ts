import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisRepository } from '../../domain/ports/analysis-repository.port'

export class SupabaseAnalysisRepositoryAdapter implements AnalysisRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async markCompleted(analysisId: string): Promise<void> {
    const { error } = await this.supabase
      .from('analyses')
      .update({ status: 'completed' })
      .eq('id', analysisId)

    if (error) throw new Error(`Error marking analysis completed: ${error.message}`)
  }
}
