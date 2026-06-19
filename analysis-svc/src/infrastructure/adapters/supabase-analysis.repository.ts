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
    const finalStatus = isPlatino ? 'awaiting_payment' : 'completed'
    const anomalies = result.anomalies ?? []
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

  async markError(analysisId: string, userId: string): Promise<void> {
    await this.updateStatus(analysisId, userId, 'error')
  }
}
