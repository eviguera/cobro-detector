import type { FastifyInstance } from 'fastify'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { SupabaseMetricsRepository } from '../infrastructure/adapters/supabase-metrics.repository.js'
import { GetMetricsUseCase } from '../application/get-metrics.use-case.js'
import { GetSystemHealthUseCase } from '../application/get-system-health.use-case.js'

const supabase = createServiceClient()
const metricsRepo = new SupabaseMetricsRepository(supabase)
const getMetrics = new GetMetricsUseCase(metricsRepo)
const getSystemHealth = new GetSystemHealthUseCase(metricsRepo)

export async function adminRoutes(app: FastifyInstance) {
  app.get('/v1/metrics', async (_request, reply) => {
    const metrics = await getMetrics.execute()
    return reply.send(metrics)
  })

  app.get('/v1/health', async (_request, reply) => {
    const health = await getSystemHealth.execute()
    return reply.send(health)
  })

  app.get('/v1/intelligence', async (_request, reply) => {
    const [totalUsersResult, usersWithAnalyses, usersWithAnomalies, allProfiles] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('analyses')
        .select('user_id')
        .then(r => {
          const uniqueUsers = new Set((r.data ?? []).map(a => (a as Record<string, unknown>).user_id as string))
          return { count: uniqueUsers.size }
        }),
      supabase
        .from('anomalies')
        .select('user_id')
        .then(r => {
          const uniqueUsers = new Set((r.data ?? []).map(a => (a as Record<string, unknown>).user_id as string))
          return { count: uniqueUsers.size }
        }),
      supabase.from('profiles').select('id, created_at'),
    ])

    const totalUsers = totalUsersResult.count ?? 0
    const activeAnalysts = usersWithAnalyses.count
    const anomalyUsers = usersWithAnomalies.count
    const conversionRate = totalUsers > 0 ? ((activeAnalysts / totalUsers) * 100).toFixed(1) : '0.0'

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const profiles = allProfiles.data ?? []
    const recentUserIds = new Set(
      profiles
        .filter(p => new Date((p as Record<string, unknown>).created_at as string) > thirtyDaysAgo)
        .map(p => (p as Record<string, unknown>).id as string),
    )

    const churnRiskUsers = totalUsers - recentUserIds.size

    return reply.send({
      totalUsers,
      usersWithAnalyses: activeAnalysts,
      usersWithAnomalies: anomalyUsers,
      conversionRate: `${conversionRate}%`,
      churnRisk: {
        usersAtRisk: churnRiskUsers,
        threshold: '30 days without activity',
      },
    })
  })
}
