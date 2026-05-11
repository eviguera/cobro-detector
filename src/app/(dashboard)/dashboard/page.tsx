import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, Plus, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Clock, Sparkles, Banknote, Shield } from 'lucide-react'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis, Credits } from '@/types/database.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [analysesResult, creditsResult] = await Promise.all([
    supabase.from('analyses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('credits').select('*').eq('user_id', user!.id).single(),
  ])
  const analyses = analysesResult.data as Analysis[] | null
  const credits = creditsResult.data as Credits | null

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)
  const completedAnalyses = analyses?.filter(a => a.status === 'completed').length ?? 0
  const totalAnalyses = analyses?.length ?? 0
  const creditUsage = credits?.total ? Math.round(((credits?.used ?? 0) / credits.total) * 100) : 0

  const stats = [
    {
      label: 'Créditos disponibles',
      value: String(creditsLeft),
      icon: Banknote,
      trend: creditsLeft === 0 ? 'empty' : creditsLeft >= 3 ? 'good' : 'low',
      sub: creditsLeft === 0 ? 'Sin créditos' : `${credits?.total ?? 0} totales`,
      subLink: creditsLeft === 0 ? '/precios' : undefined,
      detail: creditsLeft === 0 ? 'Compra créditos para seguir analizando' : creditUsage > 0 ? `${creditUsage}% utilizado` : 'Aún sin uso',
      accent: 'brand' as const,
    },
    {
      label: 'Análisis realizados',
      value: String(totalAnalyses),
      icon: BarChart3,
      trend: totalAnalyses === 0 ? 'empty' : 'good',
      sub: `${completedAnalyses} completados`,
      detail: completedAnalyses === 0 ? 'Comienza subiendo tu primer estado de cuenta' : `${totalAnalyses - completedAnalyses} en proceso`,
      accent: 'success' as const,
    },
    {
      label: 'Anomalías detectadas',
      value: String(totalAnomalies),
      icon: AlertTriangle,
      trend: totalAnomalies === 0 ? 'low' : totalAnomalies > 10 ? 'high' : 'good',
      sub: totalAnomalies === 0 ? 'Sin irregularidades' : 'cobros incorrectos',
      detail: totalAnomalies === 0 ? 'Tus cuentas están limpias' : 'Revisa los detalles para reclamar',
      accent: totalAnomalies > 0 ? 'danger' as const : 'muted' as const,
    },
    {
      label: 'Monto recuperable',
      value: formatCLP(totalRecoverable),
      icon: TrendingDown,
      trend: totalRecoverable === 0 ? 'empty' : 'high',
      sub: totalRecoverable === 0 ? '$0 detectado' : 'estimado total',
      detail: totalRecoverable > 0 ? 'Listo para reclamar al banco' : 'Sube un estado de cuenta para comenzar',
      accent: totalRecoverable > 0 ? 'danger' as const : 'muted' as const,
      large: true,
    },
  ]

  const recentAnalyses = analyses?.slice(0, 5) ?? []

  return (
    <div className="animate-fade-in-up space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-subtle" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400">
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
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-brand-600/20 dark:shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-600/30 dark:hover:shadow-brand-500/40 hover:-translate-y-0.5"
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
              stat.accent === 'brand' ? 'bg-brand-500' :
              stat.accent === 'success' ? 'bg-emerald-500' :
              stat.accent === 'danger' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />

            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                stat.accent === 'brand' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' :
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
            <p className={`font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight ${stat.large ? 'text-xl' : 'text-2xl'}`}>
              <span className="tabular-nums">{stat.value}</span>
            </p>
            <div className="mt-2 flex items-center justify-between">
              {stat.subLink ? (
                <Link href={stat.subLink} className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
                  {stat.sub} →
                </Link>
              ) : (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{stat.sub}</p>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-gray-300 dark:text-gray-600">{stat.detail}</p>
          </div>
        ))}
      </div>

      <section className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
              <Activity className="w-[18px] h-[18px] text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Actividad reciente
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {recentAnalyses.length > 0 ? 'Últimos análisis realizados' : 'Aún no hay actividad'}
              </p>
            </div>
          </div>
          {recentAnalyses.length > 0 && (
            <Link
              href="/historial"
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-xl transition-all duration-200"
            >
              Ver todo
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 flex items-center justify-center shadow-inner">
              <FileSearch className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Aún no tienes análisis
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
              Sube tu primer estado de cuenta y descubre si tu banco te está cobrando de más
            </p>
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-brand-600/20 dark:shadow-brand-600/30"
            >
              <Sparkles className="w-4 h-4" />
              Primer análisis gratis
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
            {recentAnalyses.map((analysis, i) => {
              const isCompleted = analysis.status === 'completed'
              const isProcessing = analysis.status === 'processing'
              return (
                <Link
                  key={analysis.id}
                  href={`/historial/${analysis.id}`}
                  className="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                      : isProcessing
                        ? 'bg-brand-50 dark:bg-brand-900/20 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isProcessing ? (
                      <div className="w-5 h-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {analysis.file_name}
                      </p>
                      {analysis.anomalies_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {analysis.anomalies_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {analysis.bank ?? 'Banco no detectado'}
                      </span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(analysis.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Anomalías</p>
                      <p className={`text-sm font-semibold tabular-nums mt-0.5 ${
                        analysis.anomalies_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {analysis.anomalies_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Recuperable</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                        {formatCLP(analysis.recoverable_amount)}
                      </p>
                    </div>
                    <div className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${
                      isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                      isProcessing ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' :
                      'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isCompleted ? 'Completado' : isProcessing ? 'Procesando' : 'Error'}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
