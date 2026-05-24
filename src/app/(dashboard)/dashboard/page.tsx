import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileSearch, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, Plus, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Clock, Sparkles, Banknote, Shield, CalendarDays, Building2, Percent, Brain } from 'lucide-react'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis, Credits } from '@/types/database.types'
import { DashboardClient } from './dashboard-client'
import { SavingsChart } from '@/components/savings-chart'

function getDayLabel(date: Date, today: Date): string {
  const diff = today.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return formatDate(date.toISOString())
}

function getWeekdayLabel(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [analysesResult, creditsResult] = await Promise.all([
    supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('credits').select('*').eq('user_id', user.id).single(),
  ])
  const analyses = analysesResult.data as Analysis[] | null
  const credits = creditsResult.data as Credits | null

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)
  const completedAnalyses = analyses?.filter(a => a.status === 'completed').length ?? 0
  const totalAnalyses = analyses?.length ?? 0
  const creditUsage = credits?.total ? Math.round(((credits?.used ?? 0) / credits.total) * 100) : 0

  const analysesWithAnomalies = analyses?.filter(a => (a.anomalies_count ?? 0) > 0).length ?? 0
  const detectionRate = totalAnalyses > 0 ? Math.round((analysesWithAnomalies / totalAnalyses) * 100) : 0

  const bankStats = analyses?.reduce<Record<string, { count: number; anomalies: number; recoverable: number }>>((acc, a) => {
    const bank = a.bank ?? 'Desconocido'
    if (!acc[bank]) acc[bank] = { count: 0, anomalies: 0, recoverable: 0 }
    acc[bank].count++
    acc[bank].anomalies += a.anomalies_count ?? 0
    acc[bank].recoverable += a.recoverable_amount ?? 0
    return acc
  }, {}) ?? {}

  const topBank = Object.entries(bankStats)
    .filter(([name]) => name !== 'Desconocido')
    .sort(([, a], [, b]) => b.anomalies - a.anomalies)[0]

  const dailyAnalyses: { date: string; count: number; dateObj: Date }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = analyses?.filter(a => a.created_at?.startsWith(dateStr)).length ?? 0
    dailyAnalyses.push({ date: dateStr, count, dateObj: d })
  }
  const maxDailyCount = Math.max(...dailyAnalyses.map(d => d.count), 1)

  const stats = [
    {
      label: 'Créditos disponibles',
      value: String(creditsLeft),
      icon: Banknote,
      trend: creditsLeft === 0 ? 'empty' as const : creditsLeft >= 3 ? 'good' as const : 'low' as const,
      sub: creditsLeft === 0 ? 'Sin créditos' : `${credits?.total ?? 0} totales`,
      subLink: creditsLeft === 0 ? '/precios' : undefined,
      detail: creditsLeft === 0 ? 'Compra créditos para seguir analizando' : creditUsage > 0 ? `${creditUsage}% utilizado` : 'Aún sin uso',
      accent: 'brand' as const,
    },
    {
      label: 'Análisis realizados',
      value: String(totalAnalyses),
      icon: BarChart3,
      trend: totalAnalyses === 0 ? 'empty' as const : 'good' as const,
      sub: `${completedAnalyses} completados`,
      detail: completedAnalyses === 0 ? 'Comienza subiendo tu primer estado de cuenta' : `${totalAnalyses - completedAnalyses} en proceso`,
      accent: 'success' as const,
    },
    {
      label: 'Tasa de detección',
      value: `${detectionRate}%`,
      icon: Percent,
      trend: detectionRate === 0 ? 'empty' as const : detectionRate > 50 ? 'high' as const : 'low' as const,
      sub: `${analysesWithAnomalies} de ${totalAnalyses} con anomalías`,
      detail: detectionRate === 0 ? 'Sin anomalías detectadas aún' : 'de análisis tienen cobros incorrectos',
      accent: detectionRate > 0 ? 'danger' as const : 'muted' as const,
    },
    {
      label: 'Monto recuperable',
      value: formatCLP(totalRecoverable),
      icon: TrendingDown,
      trend: totalRecoverable === 0 ? 'empty' as const : 'high' as const,
      sub: totalRecoverable === 0 ? '$0 detectado' : 'estimado total',
      detail: totalRecoverable > 0 ? 'Listo para reclamar al banco' : 'Sube un estado de cuenta para comenzar',
      accent: totalRecoverable > 0 ? 'danger' as const : 'muted' as const,
      large: true,
    },
  ]

  const recentAnalyses = analyses?.slice(0, 5) ?? []

  const monthlyRecovery = analyses?.reduce<Record<string, number>>((acc, a) => {
    const month = a.created_at?.substring(0, 7) ?? 'unknown'
    acc[month] = (acc[month] ?? 0) + (a.recoverable_amount ?? 0)
    return acc
  }, {}) ?? {}
  const savingsData = Object.entries(monthlyRecovery)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([month, amount]) => {
      const [y, m] = month.split('-')
      const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return { month: names[parseInt(m) - 1], amount }
    })

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-blue-500 to-blue-300 rounded-full hidden sm:block" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-subtle" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
              Panel de Control
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 max-w-md">
            Resumen de actividad y detección de cobros injustificados
          </p>
        </div>
        <Link
          href="/analisis"
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Nuevo análisis
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="relative bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute top-0 left-5 right-5 h-0.5 rounded-full ${
              stat.accent === 'brand' ? 'bg-blue-500' :
              stat.accent === 'success' ? 'bg-emerald-500' :
              stat.accent === 'danger' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />

            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                stat.accent === 'brand' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                stat.accent === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                stat.accent === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              }`}>
                <stat.icon className="w-[18px] h-[18px]" />
              </div>
              {stat.trend === 'good' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
              {stat.trend === 'high' && <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
              {stat.trend === 'low' && <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />}
              {stat.trend === 'empty' && <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
            </div>

            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums ${stat.large ? 'text-xl' : 'text-2xl'}`}>
              {stat.value}
            </p>
            <div className="mt-2 flex items-center justify-between">
              {stat.subLink ? (
                <Link href={stat.subLink} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  {stat.sub} →
                </Link>
              ) : (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{stat.sub}</p>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-400">{stat.detail}</p>
          </div>
        ))}
      </div>

      {totalRecoverable > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          <div className="lg:col-span-2">
            <SavingsChart data={savingsData} total={totalRecoverable} />
          </div>
          <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Brain className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Insights</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Resumen inteligente</p>
              </div>
            </div>

            <div className="space-y-3">
              {topBank && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{topBank[0]}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {topBank[1].anomalies} anomalías · {formatCLP(topBank[1].recoverable)} recuperable
                    </p>
                  </div>
                </div>
              )}

              {totalAnomalies > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Promedio por análisis</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {(totalAnomalies / (analysesWithAnomalies || 1)).toFixed(1)} anomalías por caso detectado
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Última actividad</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {recentAnalyses.length > 0
                      ? getDayLabel(new Date(recentAnalyses[0].created_at), today)
                      : 'Sin actividad'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 stagger-children">
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Actividad semanal
                </h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Últimos 7 días
                </p>
              </div>
            </div>
            {totalAnalyses > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {dailyAnalyses.reduce((s, d) => s + d.count, 0)} total
              </span>
            )}
          </div>

          {totalAnalyses === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400 dark:text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Sin actividad aún</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Los análisis aparecerán aquí</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 sm:gap-3 h-32 sm:h-36">
              {dailyAnalyses.map((day, i) => {
                const height = day.count > 0 ? Math.max((day.count / maxDailyCount) * 100, 8) : 4
                const isToday = i === dailyAnalyses.length - 1
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                      {day.count}
                    </span>
                    <div
                      className={`w-full rounded-lg transition-all duration-500 hover:opacity-80 cursor-pointer ${
                        isToday
                          ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-sm shadow-blue-500/20'
                          : day.count > 0
                            ? 'bg-blue-200 dark:bg-blue-800'
                            : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <span className={`text-[10px] font-medium mt-1 ${isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {getWeekdayLabel(day.dateObj)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <DashboardClient analyses={analyses ?? []}
        emptyState={
          <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 text-center py-16 px-6 shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 flex items-center justify-center shadow-inner">
              <FileSearch className="w-6 h-6 text-gray-400 dark:text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Aún no tienes análisis
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
              Sube tu primer estado de cuenta y descubre si tu banco te está cobrando de más
            </p>
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30"
            >
              <Sparkles className="w-4 h-4" />
              Nuevo análisis
            </Link>
          </div>
        }
      />
    </div>
  )
}
