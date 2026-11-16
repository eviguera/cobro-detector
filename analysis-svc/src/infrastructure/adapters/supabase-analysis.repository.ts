import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisRepository } from '../../domain/ports/analysis.repository.port.js'
import type { AnalysisResult } from '../../domain/analysis-result.entity.js'

export class SupabaseAnalysisRepository implements AnalysisRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(userId: string, fileName: string, fileType: string, fileUrl: string, companyId: string | null): Promise<string> {
    const { data, error } = await this.supabase
      .from('analyses')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        file_url: fileUrl,
        company_id: companyId,
        status: 'pending',
      })
      .select()
      .single()
    if (error || !data) throw error ?? new Error('Failed to create analysis')
    return data.id as string
  }

  async getCreditsLeft(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('credits')
      .select('total, used')
      .eq('user_id', userId)
      .is('company_id', null)
      .single()
    return Math.max(0, (data?.total as number ?? 0) - (data?.used as number ?? 0))
  }

  async updateStatus(analysisId: string, userId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('analyses')
      .update({ status })
      .eq('id', analysisId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async storeResults(analysisId: string, userId: string, result: AnalysisResult, isPlatino: boolean): Promise<void> {
    const anomalies = result.anomalies ?? []
    const recoverableAmount = result.totalRecoverable ?? 0
    // Platino solo bloquea el reporte cuando hay algo que cobrar.
    // Sin anomalías no corresponde pedir pago.
    const finalStatus = isPlatino && recoverableAmount > 0 ? 'awaiting_payment' : 'completed'
    const { error } = await this.supabase
      .from('analyses')
      .update({
        status: finalStatus,
        anomalies_count: anomalies.length,
        total_transactions: result.totalTransactions ?? 0,
        recoverable_amount: result.totalRecoverable ?? 0,
        period_start: result.period?.start ?? null,
        period_end: result.period?.end ?? null,
        bank: result.bank ?? null,
        anomalies: anomalies as unknown as Record<string, unknown>[],
        ai_summary: result.aiSummary ?? null,
        raw_data: result.transactions ?? [],
      })
      .eq('id', analysisId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async insertAnomalies(analysisId: string, userId: string, anomalies: Array<Record<string, unknown>>): Promise<void> {
    const { error } = await this.supabase.from('anomalies').insert(anomalies)
    if (error) throw error
  }

  /**
   * Idempotencia para re-ejecuciones de la cola (reaper/retry): un job que
   * corre dos veces no debe dejar anomalías duplicadas.
   */
  async deleteAnomaliesByAnalysis(analysisId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('anomalies')
      .delete()
      .eq('analysis_id', analysisId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async markError(analysisId: string, userId: string): Promise<void> {
    // CAS: solo un análisis pendiente o en proceso puede pasar a 'error'.
    // Sin esto, una re-ejecución (reap de un job lento) degradaría un
    // análisis ya completado/awaiting_payment y devolvería crédito de un
    // reporte ya entregado.
    const { error } = await this.supabase
      .from('analyses')
      .update({ status: 'error' })
      .eq('id', analysisId)
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
    if (error) throw error
  }
}
