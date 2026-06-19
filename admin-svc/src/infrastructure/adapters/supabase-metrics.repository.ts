import type { DashboardMetrics, SystemHealth, MetricsRepository } from '../../domain/ports/metrics.repository.port.js'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseMetricsRepository implements MetricsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [usersResult, analysesResult, ordersResult] = await Promise.all([
      this.supabase.from('profiles').select('id', { count: 'exact', head: true }),
      this.supabase.from('analyses').select('id, status, user_id, recoverable_amount'),
      this.supabase.from('orders').select('amount_clp, status').eq('status', 'paid'),
    ])

    const totalUsers = usersResult.count ?? 0
    const analyses = analysesResult.data ?? []
    const totalAnalyses = analyses.length
    const totalAnomalies = 0
    const totalRecovered = analyses.reduce((sum, a) => sum + ((a as Record<string, unknown>).recoverable_amount as number || 0), 0)
    const revenue = (ordersResult.data ?? []).reduce((sum, o) => sum + ((o as Record<string, unknown>).amount_clp as number || 0), 0)
    const activeUsers = new Set(analyses.map(a => (a as Record<string, unknown>).user_id as string)).size

    return {
      totalUsers,
      totalAnalyses,
      totalAnomalies,
      totalRecovered,
      revenue,
      activeUsers,
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const dbResult = await this.supabase.from('profiles').select('id', { count: 'exact', head: true })

      return {
        status: 'healthy',
        lastQueueCheck: new Date().toISOString(),
        groqStatus: 'operational',
        databaseSize: `${dbResult.count ?? 0} users`,
      }
    } catch {
      return {
        status: 'degraded',
        lastQueueCheck: null,
        groqStatus: 'down',
        databaseSize: 'unknown',
      }
    }
  }
}
