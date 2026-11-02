import { apiFetch, services } from './client'
import type { Analysis, AnalysisRunResponse } from '@/domain'

const POLL_INTERVAL_MS = 3000
// Un poco menos que el timeout de 2 min del frontend para dejar margen de reacción.
const MAX_ELAPSED_MS = 110_000

export function runAnalysis(analysisId: string, signal?: AbortSignal): Promise<AnalysisRunResponse> {
  return (async () => {
    // 1. Encolar el análisis: el backend devuelve 202 Accepted inmediatamente.
    await apiFetch<{ analysisId: string; status: string; message: string }>(
      services.analysis.baseUrl,
      '/v1/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ analysisId }),
        signal,
      },
    )

    // 2. Polling hasta que el análisis termine (completed / awaiting_payment / error).
    const startTime = Date.now()
    for (;;) {
      if (signal?.aborted) {
        const abortErr = new Error('AbortError') as Error & { name: string }
        abortErr.name = 'AbortError'
        throw abortErr
      }

      const analysis = await apiFetch<Analysis>(
        services.analysis.baseUrl,
        `/v1/analyses/${analysisId}`,
        { signal },
      )

      if (analysis.status === 'completed' || analysis.status === 'awaiting_payment') {
        return mapAnalysisToResponse(analysis)
      }

      if (analysis.status === 'error') {
        throw new Error(`El análisis falló: ${analysis.id}`)
      }

      // pending / processing / queued: seguir esperando.
      const elapsed = Date.now() - startTime
      if (elapsed >= MAX_ELAPSED_MS) {
        throw new Error(
          'El análisis está tardando más de lo esperado. Puedes revisar el historial en unos minutos.',
        )
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  })()
}

function mapAnalysisToResponse(analysis: Analysis): AnalysisRunResponse {
  const awaitingPayment = analysis.status === 'awaiting_payment'
  return {
    analysisId: analysis.id,
    status: analysis.status,
    totalTransactions: analysis.total_transactions,
    anomaliesCount: analysis.anomalies_count,
    recoverableAmount: analysis.recoverable_amount,
    summary: analysis.ai_summary ?? '',
    bank: analysis.bank ?? '',
    awaitingPayment,
    paymentAmount: awaitingPayment ? Math.round(analysis.recoverable_amount * 0.2) : undefined,
  }
}

export function getAnalysis(id: string): Promise<Analysis> {
  return apiFetch<Analysis>(
    services.analysis.baseUrl,
    `/v1/analyses/${id}`,
  )
}
