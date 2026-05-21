import { createClient } from '@/lib/supabase/server'
import { analyzeFile, type AnalysisResult } from '@/lib/analyzer'
import { createAnalysisRecord } from '@/lib/services/credit.service'
import { enqueueAnalysis } from '@/lib/analysis-queue'

export interface FileUploadResult {
  fileName: string
  fileUrl: string
}

export async function uploadFileToStorage(
  file: File,
  userId: string,
): Promise<FileUploadResult> {
  const supabase = await createClient()
  const fileBuffer = await file.arrayBuffer()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${Date.now()}-${safeFileName}`

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('analysis-files')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError || !uploadData) {
    throw new Error(`Error al subir archivo: ${uploadError?.message || 'desconocido'}`)
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('analysis-files')
    .getPublicUrl(storagePath)

  return { fileName: storagePath, fileUrl: publicUrl }
}

export async function createAnalysisWithPlan(
  userId: string,
  file: File,
  fileUrl: string,
  isPlatino: boolean,
): Promise<string> {
  const supabase = await createClient()

  if (isPlatino) {
    const { data: analysis, error } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_url: fileUrl,
        status: 'processing',
      })
      .select()
      .single()

    if (error || !analysis) {
      throw new Error('Error al crear análisis Platino')
    }

    return analysis.id
  }

  const analysisId = await createAnalysisRecord(
    supabase,
    userId,
    file.name,
    file.type,
    fileUrl,
    null,
  )

  if (!analysisId) {
    throw new NoCreditsError()
  }

  return analysisId
}

export class NoCreditsError extends Error {
  constructor() {
    super('Sin créditos disponibles')
    this.name = 'NoCreditsError'
  }
}

export interface AnalysisSyncResult {
  totalTransactions: number
  anomaliesCount: number
  recoverableAmount: number
  anomalies: unknown[]
  summary?: string
  bank?: string
  awaitingPayment: boolean
  paymentAmount?: number
}

export async function executeAndStoreAnalysis(
  userId: string,
  analysisId: string,
  fileUrl: string,
  fileType: string,
  fileName: string,
  isPlatino: boolean,
): Promise<AnalysisSyncResult> {
  const supabase = await createClient()

  await supabase
    .from('analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId)
    .eq('user_id', userId)

  const result: AnalysisResult = await analyzeFile(fileUrl, fileType, {
    userId,
    companyId: null,
    fileName,
  })

  const txCount = result.totalTransactions ?? 0
  const anomalyCount = result.anomalies?.length ?? 0
  console.log(`📊 Análisis ${analysisId}: ${txCount} transacciones, ${anomalyCount} anomalías`)

  if (result.success === false) {
    throw new Error(result.error || 'El motor de análisis no pudo procesar el archivo')
  }

  const finalStatus = isPlatino ? 'awaiting_payment' : 'completed'

  await supabase
    .from('analyses')
    .update({
      status: finalStatus,
      anomalies_count: anomalyCount,
      total_transactions: txCount,
      recoverable_amount: result.totalRecoverable ?? 0,
      period_start: result.period?.start ?? null,
      period_end: result.period?.end ?? null,
      bank: result.bank ?? null,
      anomalies: result.anomalies ?? [],
      ai_summary: result.aiSummary ?? null,
      raw_data: result.transactions ?? [],
    })
    .eq('id', analysisId)
    .eq('user_id', userId)

  if (result.anomalies && result.anomalies.length > 0) {
    const anomaliesToInsert = result.anomalies.map((anomaly: any) => ({
      analysis_id: analysisId,
      user_id: userId,
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      detail: anomaly.detail ?? null,
      recoverable_amount: anomaly.recoverableAmount,
      transaction_refs: anomaly.transactionRefs,
      status: 'pending',
    }))

    await supabase
      .from('anomalies')
      .insert(anomaliesToInsert)
  }

  return {
    totalTransactions: txCount,
    anomaliesCount: anomalyCount,
    recoverableAmount: result.totalRecoverable ?? 0,
    anomalies: result.anomalies ?? [],
    summary: result.aiSummary ?? undefined,
    bank: result.bank ?? undefined,
    awaitingPayment: isPlatino,
    paymentAmount: isPlatino ? Math.round((result.totalRecoverable ?? 0) * 0.2) : undefined,
  }
}

export function enqueueAnalysisFallback(
  userId: string,
  analysisId: string,
  fileUrl: string,
  fileType: string,
  fileName: string,
): void {
  enqueueAnalysis({
    userId,
    fileName,
    filePath: fileUrl,
    fileType,
    companyId: null,
    analysisId,
  }).catch(err => console.error('Error en fallback async:', err))
}

export async function markAnalysisError(
  analysisId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('analyses')
    .update({ status: 'error' })
    .eq('id', analysisId)
    .eq('user_id', userId)
}

export async function getCreditsLeft(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data: credits } = await supabase
    .from('credits')
    .select('total, used')
    .eq('user_id', userId)
    .is('company_id', null)
    .single()

  return Math.max(0, (credits?.total ?? 0) - (credits?.used ?? 0))
}
