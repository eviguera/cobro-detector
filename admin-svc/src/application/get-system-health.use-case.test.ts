import { describe, it, expect, vi } from 'vitest'
import { GetSystemHealthUseCase } from './get-system-health.use-case.js'
import type { MetricsRepository, SystemHealth } from '../domain/ports/metrics.repository.port.js'

function mockMetricsRepository(overrides?: Partial<MetricsRepository>): MetricsRepository {
  return {
    getDashboardMetrics: vi.fn(),
    getSystemHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      lastQueueCheck: '2025-01-01T00:00:00.000Z',
      groqStatus: 'operational',
      databaseSize: '100 users',
    }),
    ...overrides,
  }
}

describe('GetSystemHealthUseCase', () => {
  it('returns system health from repository', async () => {
    const repo = mockMetricsRepository()
    const useCase = new GetSystemHealthUseCase(repo)

    const result = await useCase.execute()

    expect(result).toEqual<SystemHealth>({
      status: 'healthy',
      lastQueueCheck: '2025-01-01T00:00:00.000Z',
      groqStatus: 'operational',
      databaseSize: '100 users',
    })
    expect(repo.getSystemHealth).toHaveBeenCalledOnce()
  })

  it('delegates to repository.getSystemHealth', async () => {
    const repo = mockMetricsRepository()
    const useCase = new GetSystemHealthUseCase(repo)

    await useCase.execute()

    expect(repo.getSystemHealth).toHaveBeenCalledWith()
  })

  it('propagates degraded health from repository', async () => {
    const degradedHealth: SystemHealth = {
      status: 'degraded',
      lastQueueCheck: null,
      groqStatus: 'down',
      databaseSize: 'unknown',
    }
    const repo = mockMetricsRepository({ getSystemHealth: vi.fn().mockResolvedValue(degradedHealth) })
    const useCase = new GetSystemHealthUseCase(repo)

    const result = await useCase.execute()

    expect(result).toBe(degradedHealth)
  })
})
