import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, ArrowRight, Plus, Clock, AlertTriangle, CheckCircle2, FileText, TrendingDown, CalendarDays } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'
import type { Analysis } from '@/types/database.types'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: analysesData } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const analyses = analysesData as Analysis[] | null

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 font-mono">
              Historial
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Mis análisis
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-mono">
            {analyses?.length ?? 0} análisis realizados · {formatCLP(totalRecoverable)} recuperable
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

      {/* Summary Stats - Mobile Friendly */}
      {analyses && analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 stagger-children">
          <div className="card-fintech rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total análisis</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {analyses.length}
            </p>
          </div>
          <div className="card-fintech rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Anomalías</p>
            <p className="text-xl font-display font-bold text-danger-600 dark:text-danger-400 tabular-nums">
              {totalAnomalies}
            </p>
          </div>
          <div className="card-fintech rounded-xl p-4 col-span-2 sm:col-span-1 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Recuperable</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatCLP(totalRecoverable)}
            </p>
          </div>
        </div>
      )}

      {!analyses || analyses.length === 0 ? (
        <div className="card-fintech rounded-2xl text-center py-20 px-6">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <FileSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No tienes análisis aún
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Sube tu estado de cuenta para comenzar a detectar cobros incorrectos
          </p>
          <Link
            href="/analisis"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Primer análisis gratis
          </Link>
        </div>
      ) : (
        <div className="card-fintech rounded-2xl overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_120px_110px_40px] gap-4 px-6 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800/50">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Archivo
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">
              Transacciones
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">
              Anomalías
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">
              Recuperable
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">
              Estado
            </span>
            <span />
          </div>

          {/* List Items */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {analyses.map((analysis, i) => (
              <Link
                key={analysis.id}
                href={`/historial/${analysis.id}`}
                className="group flex flex-col sm:grid sm:grid-cols-[1fr_120px_100px_120px_110px_40px] gap-3 sm:gap-4 px-5 sm:px-6 py-4 sm:py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* File Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-950 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {analysis.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                      <span className="truncate">{analysis.bank ?? 'Banco no detectado'}</span>
                      <span className="hidden xs:inline">·</span>
                      <span className="whitespace-nowrap">{formatDate(analysis.created_at)}</span>
                    </div>
                    {/* Mobile: Show period */}
                    {analysis.period_start && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:hidden">
                        <CalendarDays className="w-3 h-3 inline mr-1" />
                        {formatDate(analysis.period_start)} – {formatDate(analysis.period_end!)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Transactions - Hidden on mobile, shown in grid */}
                <div className="hidden sm:flex items-center justify-end">
                  <span className="text-sm font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {analysis.total_transactions}
                  </span>
                </div>

                {/* Anomalies */}
                <div className="flex items-center justify-between sm:justify-end">
                  <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">Anomalías</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    analysis.anomalies_count > 0
                      ? 'text-danger-600 dark:text-danger-400'
                      : 'text-success-600 dark:text-success-400'
                  }`}>
                    {analysis.anomalies_count}
                  </span>
                </div>

                {/* Recoverable */}
                <div className="flex items-center justify-between sm:justify-end">
                  <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">Recuperable</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatCLP(analysis.recoverable_amount)}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between sm:justify-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">Estado</span>
                  <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                    analysis.status === 'completed' ? 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400' :
                    analysis.status === 'processing' ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400' :
                    'bg-danger-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-400'
                  }`}>
                    {analysis.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : analysis.status === 'processing' ? (
                      <Clock className="w-3 h-3 mr-1 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    {getStatusLabel(analysis.status)}
                  </span>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
