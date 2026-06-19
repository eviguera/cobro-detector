import type { MetricsRepository, SystemHealth } from '../domain/ports/metrics.repository.port.js'

export class GetSystemHealthUseCase {
  constructor(private metricsRepo: MetricsRepository) {}

  async execute(): Promise<SystemHealth> {
    return this.metricsRepo.getSystemHealth()
  }
}
