import { apiFetch, services } from './client'
import type { AnalysisRunResponse, Analysis } from '@/domain'

export function runAnalysis(analysisId: string, signal?: AbortSignal): Promise<AnalysisRunResponse> {
  return apiFetch<AnalysisRunResponse>(
    services.analysis.baseUrl,
    '/v1/analyze',
    {
      method: 'POST',
      body: JSON.stringify({ analysisId }),
      signal,
    },
  )
}

export function getAnalysis(id: string): Promise<Analysis> {
  return apiFetch<Analysis>(
    services.analysis.baseUrl,
    `/v1/analyses/${id}`,
  )
}
