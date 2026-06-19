export interface DashboardMetrics {
  totalUsers: number
  totalAnalyses: number
  totalAnomalies: number
  totalRecovered: number
  revenue: number
  activeUsers: number
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  lastQueueCheck: string | null
  groqStatus: 'operational' | 'degraded' | 'down'
  databaseSize: string
}

export interface MetricsRepository {
  getDashboardMetrics(): Promise<DashboardMetrics>
  getSystemHealth(): Promise<SystemHealth>
}
