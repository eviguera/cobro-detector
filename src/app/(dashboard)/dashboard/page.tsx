import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileSearch, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, Plus, BarChart3, Activity, Clock, Sparkles, Banknote, CalendarDays, Building2, Percent, Brain, ArrowUpRight } from 'lucide-react'
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

function KpiCard({ icon: Icon, value, label, trend, accent }: { icon: typeof Banknote; value: string; label: string; trend?: string; accent: 'blue' | 'emerald' | 'red' | 'muted' }) {
  const colors = {
    blue: 'text-[#4c6ef5] bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-[#10b981] bg-emerald-50 dark:bg-emerald-900/20',
    red: 'text-[#ef4444] bg-red-50 dark:bg-red-900/20',
    muted: 'text-gray-400 bg-gray-100 dark:bg-gray-800',
  }
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 p-6 text-center" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.06))' }}>
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-3 ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-gray-100 tabular-nums leading-none mb-1.5">{value}</p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {trend && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{trend}</p>}
    </div>
  )
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
    { icon: Banknote, value: String(creditsLeft), label: 'Créditos disponibles', trend: creditsLeft === 0 ? 'Sin créditos' : `${credits?.total ?? 0} totales`, accent: creditsLeft === 0 ? 'muted' as const : 'blue' as const },
    { icon: BarChart3, value: String(totalAnalyses), label: 'Análisis realizados', trend: `${completedAnalyses} completados`, accent: totalAnalyses === 0 ? 'muted' as const : 'emerald' as const },
    { icon: Percent, value: `${detectionRate}%`, label: 'Tasa de detección', trend: `${analysesWithAnomalies} con anomalías`, accent: detectionRate > 0 ? 'red' as const : 'muted' as const },
    { icon: TrendingDown, value: formatCLP(totalRecoverable), label: 'Monto recuperable', trend: totalRecoverable > 0 ? 'Listo para reclamar' : 'Sube un estado de cuenta', accent: totalRecoverable > 0 ? 'red' as const : 'muted' as const },
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
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4c6ef5] animate-pulse-subtle" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4c6ef5]">Panel de Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        </div>
        <Link
          href="/analisis"
          className="group inline-flex items-center gap-2 px-6 py-3 bg-[#4c6ef5] hover:bg-[#3b5bdb] text-white rounded-[30px] text-sm font-semibold transition-all duration-300 shadow-lg shadow-[#4c6ef5]/20 hover:shadow-xl hover:shadow-[#4c6ef5]/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Nuevo análisis
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <KpiCard key={stat.label} {...stat} />
        ))}
      </div>

      {totalRecoverable > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          <div className="lg:col-span-2">
            <SavingsChart data={savingsData} total={totalRecoverable} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.05))' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Brain className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-gray-900 dark:text-gray-100 text-sm">Insights</h2>
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
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{topBank[1].anomalies} anomalías · {formatCLP(topBank[1].recoverable)} recuperable</p>
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
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{(totalAnomalies / (analysesWithAnomalies || 1)).toFixed(1)} anomalías por caso</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Última actividad</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{recentAnalyses.length > 0 ? getDayLabel(new Date(recentAnalyses[0].created_at), today) : 'Sin actividad'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 stagger-children">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.05))' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Activity className="w-[18px] h-[18px] text-[#4c6ef5]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-gray-900 dark:text-gray-100 text-sm">Actividad semanal</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Últimos 7 días</p>
              </div>
            </div>
            {totalAnalyses > 0 && <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{dailyAnalyses.reduce((s, d) => s + d.count, 0)} total</span>}
          </div>
          {totalAnalyses === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400" />
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
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">{day.count}</span>
                    <div className={`w-full rounded-lg transition-all duration-500 hover:opacity-80 cursor-pointer ${isToday ? 'bg-gradient-to-t from-[#4c6ef5] to-blue-400 shadow-sm shadow-[#4c6ef5]/20' : day.count > 0 ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}
                      style={{ height: `${height}%`, minHeight: '4px' }} />
                    <span className={`text-[10px] font-medium mt-1 ${isToday ? 'text-[#4c6ef5] font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>{getWeekdayLabel(day.dateObj)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <DashboardClient analyses={analyses ?? []}
        emptyState={
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-center py-16 px-6" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.05))' }}>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-display font-bold text-gray-900 dark:text-gray-100 mb-2">Aún no tienes análisis</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">Sube tu primer estado de cuenta y descubre si tu banco te está cobrando de más</p>
            <Link href="/analisis" className="inline-flex items-center gap-2 px-6 py-3 bg-[#4c6ef5] hover:bg-[#3b5bdb] text-white rounded-[30px] text-sm font-semibold transition-all duration-300 shadow-lg shadow-[#4c6ef5]/20 hover:-translate-y-0.5">
              <Sparkles className="w-4 h-4" /> Nuevo análisis
            </Link>
          </div>
        }
      />
    </div>
  )
}
