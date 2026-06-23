import { apiFetch, services } from './client'
import type { AnalysisRunResponse, Analysis } from '@/domain'

export function runAnalysis(analysisId: string): Promise<AnalysisRunResponse> {
  return apiFetch<AnalysisRunResponse>(
    services.analysis.baseUrl,
    '/v1/analyze',
    {
      method: 'POST',
      body: JSON.stringify({ analysisId }),
    },
  )
}

export function getAnalysis(id: string): Promise<Analysis> {
  return apiFetch<Analysis>(
    services.analysis.baseUrl,
    `/v1/analyses/${id}`,
  )
}
