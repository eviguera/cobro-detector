import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMonthlyTrends, getBankStats, getAnomalyTypeStats, getTypeLabel } from '@/lib/analytics'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Building2, AlertTriangle } from 'lucide-react'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function parseMonthKey(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year.slice(2)}`
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [monthlyTrends, bankStats, anomalyTypes] = await Promise.all([
    getMonthlyTrends(user.id),
    getBankStats(user.id),
    getAnomalyTypeStats(user.id),
  ])

  const totalAnalyses = monthlyTrends.reduce((s, t) => s + t.analyses, 0)
  const totalAnomalies = monthlyTrends.reduce((s, t) => s + t.anomalies, 0)
  const totalRecoverable = monthlyTrends.reduce((s, t) => s + t.recoverable, 0)
  const maxRecoverable = Math.max(...monthlyTrends.map((t) => t.recoverable), 1)

  const hasData = totalAnalyses > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Métricas detalladas de tus análisis</p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aún no tienes datos de análisis.</p>
          <Link href="/analisis" className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
            Realizar primer análisis →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Análisis</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalAnalyses}</p>
            </div>
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Anomalías</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{totalAnomalies}</p>
            </div>
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Recuperable</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCLP(totalRecoverable)}</p>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tendencias Mensuales</h2>
            </div>

            {monthlyTrends.length > 0 ? (
              <>
                <div className="flex items-end gap-1.5 h-40">
                  {monthlyTrends.map((t) => {
                    const height = (t.recoverable / maxRecoverable) * 100
                    return (
                      <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {formatCLP(t.recoverable).replace('$', '')}
                        </span>
                        <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-md relative overflow-hidden" style={{ height: `${Math.max(height, 3)}%`, minHeight: '4px' }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 opacity-80 rounded-t-md" />
                        </div>
                        <span className="text-[10px] text-gray-500">{parseMonthKey(t.month)}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">Monto recuperable por mes (últimos 12 meses)</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sin datos mensuales aún.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Comparison */}
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Anomalías por Banco</h2>
              </div>

              {bankStats.length > 0 ? (
                <div className="space-y-3">
                  {bankStats.map((b, i) => {
                    const maxAnomalies = Math.max(...bankStats.map((x) => x.anomalies), 1)
                    const width = (b.anomalies / maxAnomalies) * 100
                    return (
                      <div key={b.bank}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{b.bank}</span>
                          <span className="text-gray-500">{b.anomalies} anomalías</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all"
                            style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin datos de bancos aún.</p>
              )}
            </div>

            {/* Anomaly Types */}
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tipos de Anomalía</h2>
              </div>

              {anomalyTypes.length > 0 ? (
                <div className="space-y-3">
                  {anomalyTypes.map((a, i) => {
                    const maxCount = Math.max(...anomalyTypes.map((x) => x.count), 1)
                    const width = (a.count / maxCount) * 100
                    return (
                      <div key={a.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{getTypeLabel(a.type)}</span>
                          <span className="text-gray-500">{a.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all"
                            style={{ width: `${width}%`, backgroundColor: COLORS[(i + 2) % COLORS.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin anomalías detectadas aún.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
