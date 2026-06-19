import { describe, it, expect, vi } from 'vitest'
import { GetMetricsUseCase } from './get-metrics.use-case.js'
import type { MetricsRepository, DashboardMetrics } from '../domain/ports/metrics.repository.port.js'

function mockMetricsRepository(overrides?: Partial<MetricsRepository>): MetricsRepository {
  return {
    getDashboardMetrics: vi.fn().mockResolvedValue({
      totalUsers: 100,
      totalAnalyses: 500,
      totalAnomalies: 25,
      totalRecovered: 500000,
      revenue: 1500000,
      activeUsers: 45,
    }),
    getSystemHealth: vi.fn(),
    ...overrides,
  }
}

describe('GetMetricsUseCase', () => {
  it('returns dashboard metrics from repository', async () => {
    const repo = mockMetricsRepository()
    const useCase = new GetMetricsUseCase(repo)

    const result = await useCase.execute()

    expect(result).toEqual<DashboardMetrics>({
      totalUsers: 100,
      totalAnalyses: 500,
      totalAnomalies: 25,
      totalRecovered: 500000,
      revenue: 1500000,
      activeUsers: 45,
    })
    expect(repo.getDashboardMetrics).toHaveBeenCalledOnce()
  })

  it('delegates to repository.getDashboardMetrics', async () => {
    const repo = mockMetricsRepository()
    const useCase = new GetMetricsUseCase(repo)

    await useCase.execute()

    expect(repo.getDashboardMetrics).toHaveBeenCalledWith()
  })

  it('propagates repository data as-is', async () => {
    const customMetrics: DashboardMetrics = {
      totalUsers: 0,
      totalAnalyses: 0,
      totalAnomalies: 0,
      totalRecovered: 0,
      revenue: 0,
      activeUsers: 0,
    }
    const repo = mockMetricsRepository({ getDashboardMetrics: vi.fn().mockResolvedValue(customMetrics) })
    const useCase = new GetMetricsUseCase(repo)

    const result = await useCase.execute()

    expect(result).toBe(customMetrics)
  })
})
