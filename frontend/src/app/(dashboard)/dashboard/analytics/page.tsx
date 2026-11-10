import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMonthlyTrends, getBankStats, getAnomalyTypeStats } from '@/lib/analytics'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Building2, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { RecoveryTrend } from '@/components/dashboard/recovery-trend'
import { TypeBreakdown } from '@/components/analysis/type-breakdown'
import type { FindingGroup } from '@/lib/analysis-insights'
import { ANOMALY_TYPES } from '@/lib/constants'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function parseMonthKey(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year.slice(2)}`
}

export const metadata: Metadata = { title: 'Métricas' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [monthlyTrends, bankStats, anomalyTypes] = await Promise.all([
    getMonthlyTrends(user.id),
    getBankStats(user.id),
    getAnomalyTypeStats(user.id),
  ])

  const totalAnalyses = monthlyTrends.reduce((sum, item) => sum + item.analyses, 0)
  const totalAnomalies = monthlyTrends.reduce((sum, item) => sum + item.anomalies, 0)
  const totalRecoverable = monthlyTrends.reduce((sum, item) => sum + item.recoverable, 0)
  const maxBankAnomalies = Math.max(...bankStats.map((item) => item.anomalies), 1)

  const typeTotal = anomalyTypes.reduce((sum, item) => sum + item.totalRecoverable, 0)
  const groups: FindingGroup[] = anomalyTypes.map((item) => ({
    type: item.type,
    label: ANOMALY_TYPES[item.type] ?? item.type,
    count: item.count,
    amount: item.totalRecoverable,
    share: typeTotal > 0 ? Math.round((item.totalRecoverable / typeTotal) * 100) : 0,
    severities: { high: 0, medium: 0, low: 0 },
  }))

  const hasData = totalAnalyses > 0

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al panel
        </Link>
        <PageHeader
          eyebrow="Métricas"
          title="Métricas de tus cartolas"
          description="Tendencias, bancos y tipos de hallazgo calculados sobre los mismos datos del panel y del historial."
        />
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="font-display text-base font-semibold">Aún no hay datos para graficar</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Necesitamos al menos una cartola analizada para mostrar tendencias.
          </p>
          <Link
            href="/analisis"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          >
            Analizar mi primera cartola
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Cartolas analizadas" value={totalAnalyses} icon={<BarChart3 className="h-5 w-5" />} accent="blue" />
            <StatCard
              title="Hallazgos"
              value={totalAnomalies}
              icon={<TrendingUp className="h-5 w-5" />}
              accent={totalAnomalies > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              title="Monto recuperable"
              value={formatCLP(totalRecoverable)}
              icon={<Building2 className="h-5 w-5" />}
              accent={totalRecoverable > 0 ? 'emerald' : 'slate'}
            />
          </div>

          {monthlyTrends.length >= 2 ? (
            <RecoveryTrend
              data={monthlyTrends.map((item) => ({
                month: parseMonthKey(item.month),
                amount: item.recoverable,
                analyses: item.analyses,
              }))}
              total={totalRecoverable}
            />
          ) : (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="eyebrow">Monto recuperable</p>
                <p className="num-display mt-1 text-2xl font-semibold tracking-tight">{formatCLP(totalRecoverable)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aún no hay suficiente historial para mostrar una tendencia. Analiza otra cartola para comparar mes a mes.
                </p>
              </div>
              <span className="inline-flex h-10 items-center rounded-xl border border-border bg-secondary/40 px-3 text-xs font-medium text-muted-foreground">
                {totalAnalyses} {totalAnalyses === 1 ? 'cartola' : 'cartolas'}
              </span>
            </Card>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="font-display text-sm font-semibold">Hallazgos por banco</h2>
              </div>
              <div className="mt-5 space-y-3">
                {bankStats.map((bank) => (
                  <div key={bank.bank}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-foreground">{bank.bank}</span>
                      <span className="num text-muted-foreground">
                        {bank.anomalies} hallazgos · {formatCLP(bank.recoverable)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(bank.anomalies / maxBankAnomalies) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <TypeBreakdown groups={groups} />
          </div>
        </>
      )}
    </div>
  )
}
