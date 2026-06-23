import { createClient } from '@/lib/supabase/server'
import { analyzeFile } from '@/lib/analyzer'
import type { AnalysisResult } from '@/lib/analyzer'

async function processAnalysis(data: {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId?: string | null
  analysisId: string
}) {
  const { userId, fileName, filePath, fileType, companyId, analysisId } = data

  const supabase = await createClient()

  // Actualizar estado a 'processing'
  await supabase
    .from('analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId)
    .eq('user_id', userId)

  try {
    // Ejecutar análisis
    const result: AnalysisResult = await analyzeFile(filePath, fileType, {
      userId,
      companyId,
      fileName,
    })

    const txCount = result.totalTransactions ?? 0
    const anomalyCount = result.anomalies?.length ?? 0

    console.info(`📊 Análisis ${analysisId}: ${txCount} transacciones, ${anomalyCount} anomalías encontradas`)

    if (result.success === false) {
      throw new Error('analyzeFile retornó error')
    }

    // Actualizar estado a 'completed'
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
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

    if (updateError) {
      throw updateError
    }

    // Insertar anomalías detectadas
    if (result.anomalies && result.anomalies.length > 0) {
      const anomaliesToInsert = result.anomalies.map((anomaly: Record<string, unknown>) => ({
        analysis_id: analysisId,
        user_id: userId,
        type: anomaly.type as string,
        title: anomaly.title as string,
        description: anomaly.description as string,
        amount: anomaly.amount as number,
        recoverable_amount: anomaly.recoverableAmount as number,
        transaction_refs: anomaly.transactionRefs as string[],
        severity: anomaly.severity as string,
      }))

      const { error: insertError } = await supabase
        .from('anomalies')
        .insert(anomaliesToInsert)

      if (insertError) {
        throw insertError
      }
    }

    return { success: true, analysisId }

  } catch (error) {
    console.error('Error procesando análisis:', error)

    // Actualizar estado a 'error'
    await supabase
      .from('analyses')
      .update({ status: 'error' })
      .eq('id', analysisId)
      .eq('user_id', userId)

    throw error
  }
}

// Función helper para encolar análisis (compatible con la API)
export async function enqueueAnalysis(data: {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId?: string | null
  analysisId: string
}) {
  // Procesar en background (no esperar)
  processAnalysis(data).catch(err => {
    console.error('Error en processAnalysis:', err)
  })
  
  return data.analysisId
}
