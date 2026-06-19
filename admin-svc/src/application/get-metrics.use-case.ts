import type { MetricsRepository, DashboardMetrics } from '../domain/ports/metrics.repository.port.js'

export class GetMetricsUseCase {
  constructor(private metricsRepo: MetricsRepository) {}

  async execute(): Promise<DashboardMetrics> {
    return this.metricsRepo.getDashboardMetrics()
  }
}
