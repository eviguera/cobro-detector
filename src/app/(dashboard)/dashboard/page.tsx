import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, Plus, BarChart3, Activity } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'
import type { Analysis, Credits } from '@/types/database.types'

// Force rebuild: remove cacheTag dependency (Next.js 14 compatibility)
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [analysesResult, creditsResult] = await Promise.all([
    supabase.from('analyses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('credits').select('*').eq('user_id', user!.id).single(),
  ])
  const analyses = analysesResult.data as Analysis[] | null
  const credits = creditsResult.data as Credits | null

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)
  const completedAnalyses = analyses?.filter(a => a.status === 'completed').length ?? 0

  const stats = [
    {
      label: 'Créditos disponibles',
      value: creditsLeft,
      icon: FileSearch,
      accent: 'brand',
      sub: creditsLeft === 0 ? 'Comprar más créditos' : `de ${credits?.total ?? 0} totales`,
      subLink: creditsLeft === 0 ? '/precios' : undefined,
    },
    {
      label: 'Análisis completados',
      value: completedAnalyses,
      icon: CheckCircle2,
      accent: 'success',
      sub: 'estados de cuenta',
    },
    {
      label: 'Anomalías detectadas',
      value: totalAnomalies,
      icon: AlertTriangle,
      accent: 'warning',
      sub: 'cobros incorrectos',
    },
    {
      label: 'Monto recuperable',
      value: formatCLP(totalRecoverable),
      icon: TrendingDown,
      accent: 'danger',
      sub: 'en total detectado',
      large: true,
    },
  ]

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 font-mono">
              Panel de control
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
            Resumen de tus análisis y anomalías detectadas en tus estados de cuenta
          </p>
        </div>
        <Link
          href="/analisis"
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
          Nuevo análisis
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 stagger-children">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="animate-fade-in-up stat-card card-fintech rounded-2xl p-5 sm:p-6 relative"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Accent indicator */}
            <div className={`absolute top-0 left-6 right-6 h-0.5 rounded-full ${
              stat.accent === 'brand' ? 'bg-brand-500' :
              stat.accent === 'success' ? 'bg-success-500' :
              stat.accent === 'warning' ? 'bg-warning-500' :
              'bg-danger-500'
            } opacity-60`} />

            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stat.accent === 'brand' ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400' :
                stat.accent === 'success' ? 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400' :
                stat.accent === 'warning' ? 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400' :
                'bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <Activity className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </div>

            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-1.5">
              {stat.label}
            </p>
            <p className={`font-display font-bold text-foreground ${stat.large ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-3xl'}`}>
              <span className="tabular-nums">{stat.value}</span>
            </p>
            {stat.subLink ? (
              <Link 
                href={stat.subLink} 
                className="inline-block mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                aria-label={`${stat.label}: ${stat.sub}`}
              >
                {stat.sub} →
              </Link>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Analyses */}
      <section className="card-fintech rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/60">
          <div>
            <h2 className="font-display font-semibold text-foreground text-base">
              Análisis recientes
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
              {analyses?.length ?? 0} análisis en total
            </p>
          </div>
          <Link
            href="/historial"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-colors"
            aria-label="Ver todos los análisis recientes"
          >
            Ver todos
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 duration-300" />
          </Link>
        </div>

        {!analyses || analyses.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <FileSearch className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base font-display font-semibold text-foreground mb-2">
              Aún no tienes análisis
            </h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
              Sube tu primer estado de cuenta y descubre en minutos si te están cobrando de más
            </p>
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5"
              aria-label="Crear nuevo análisis de estado de cuenta"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nuevo análisis
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {analyses.map((analysis, i) => (
              <Link
                key={analysis.id}
                href={`/historial/${analysis.id}`}
                className="group flex items-center justify-between px-6 py-4 sm:py-5 hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-950 transition-colors">
                    <FileSearch className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {analysis.file_name}
                    </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {analysis.bank ?? 'Banco desconocido'} · {formatDate(analysis.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-8">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">Anomalías</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      analysis.anomalies_count > 0
                        ? 'text-danger-600 dark:text-danger-400'
                        : 'text-success-600 dark:text-success-400'
                    }`}>
                      {analysis.anomalies_count}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">Recuperable</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCLP(analysis.recoverable_amount)}
                    </p>
                  </div>
                  <div className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${
                    analysis.status === 'completed' ? 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400' :
                    analysis.status === 'processing' ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400' :
                    'bg-danger-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-400'
                  }`}>
                    {getStatusLabel(analysis.status)}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
