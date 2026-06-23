import { apiFetch, services } from './client'

interface Metrics {
  totalUsers: number
  totalAnalyses: number
  totalAnomalies: number
  totalRecoverable: number
  conversionRate: number
}

interface SystemHealth {
  status: string
  services: Record<string, { status: string; latency: number }>
}

interface Intelligence {
  totalUsers: number
  usersWithAnalyses: number
  usersWithAnomalies: number
  conversionRate: string
  churnRisk: { usersAtRisk: number; threshold: string }
}

export function getMetrics(): Promise<Metrics> {
  return apiFetch<Metrics>(
    services.admin.baseUrl,
    '/v1/metrics',
  )
}

export function getAdminHealth(): Promise<SystemHealth> {
  return apiFetch<SystemHealth>(
    services.admin.baseUrl,
    '/v1/health',
  )
}

export function getIntelligence(): Promise<Intelligence> {
  return apiFetch<Intelligence>(
    services.admin.baseUrl,
    '/v1/intelligence',
  )
}
