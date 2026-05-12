import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileSearch, Plus, AlertTriangle, CheckCircle2, FileText, CalendarDays } from 'lucide-react'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis } from '@/types/database.types'
import FilterBar from './filter-bar'
import DeleteAnalysisButton from './delete-button'

function getPeriodoDates(periodo?: string): { desde?: string; hasta?: string } | undefined {
  if (!periodo || periodo === 'todas') return undefined

  const now = new Date()
  const hasta = now.toISOString()
  let desde: Date

  switch (periodo) {
    case 'semana':
      desde = new Date(now)
      desde.setDate(desde.getDate() - 7)
      break
    case 'mes':
      desde = new Date(now)
      desde.setMonth(desde.getMonth() - 1)
      break
    case 'ano':
      desde = new Date(now)
      desde.setFullYear(desde.getFullYear() - 1)
      break
    default:
      return undefined
  }

  return { desde: desde.toISOString(), hasta }
}

async function getAnalysesData(userId: string, desde?: string, hasta?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data: analysesData } = await query
  return analysesData as Analysis[] | null
}

interface Props {
  searchParams: { periodo?: string }
}

export default async function HistorialPage({ searchParams }: Props) {
  const periodo = searchParams.periodo ?? 'todas'
  const dateRange = getPeriodoDates(periodo)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const analyses = await getAnalysesData(user!.id, dateRange?.desde, dateRange?.hasta)

  const totalRecoverable = analyses?.reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0) ?? 0
  const totalAnomalies = analyses?.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0) ?? 0
  const completedCount = analyses?.filter(a => a.status === 'completed').length ?? 0

  return (
    <div className="animate-fade-in-up space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-subtle" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
              Historial
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Mis análisis
          </h1>
          <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500">
            {analyses?.length ?? 0} análisis · {completedCount} completados · {formatCLP(totalRecoverable)} recuperable
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar current={periodo as 'todas' | 'semana' | 'mes' | 'ano'} />
          <Link
            href="/analisis"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            Nuevo análisis
          </Link>
        </div>
      </header>

      {analyses && analyses.length > 0 && (
        <div className="grid grid-cols-3 gap-3 stagger-children">
          {[
            { label: 'Total análisis', value: String(analyses.length), sub: 'realizados' },
            { label: 'Anomalías', value: String(totalAnomalies), sub: 'detectadas', danger: totalAnomalies > 0 },
            { label: 'Recuperable', value: formatCLP(totalRecoverable), sub: 'estimado', large: true },
          ].map((m, i) => (
            <div key={m.label} className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-800/40 p-4 shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums ${m.large ? 'text-lg' : 'text-xl'} ${m.danger ? 'text-red-600 dark:text-red-400' : ''}`}>
                {m.value}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {!analyses || analyses.length === 0 ? (
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 text-center py-20 px-6 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 flex items-center justify-center shadow-inner">
            <FileSearch className="w-7 h-7 text-gray-400 dark:text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {periodo !== 'todas' ? 'Sin análisis en este período' : 'No tienes análisis aún'}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
            {periodo !== 'todas'
              ? 'No se encontraron análisis en el período seleccionado. Prueba con otro filtro.'
              : 'Sube tu estado de cuenta para comenzar a detectar cobros incorrectos'}
          </p>
          {periodo !== 'todas' ? (
            <Link
              href="/historial"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30"
            >
              Ver todas
            </Link>
          ) : (
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              Nuevo análisis
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_100px_90px_110px_100px_50px] gap-4 px-6 py-3 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800/30">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Archivo</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Transacciones</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Anomalías</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Recuperable</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Estado</span>
            <span />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
            {analyses.map((analysis, i) => {
              const isClickable = analysis.status === 'completed'
              const content = (
                <div className="group flex flex-col sm:grid sm:grid-cols-[1fr_100px_90px_110px_100px_50px] gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      analysis.status === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                        : analysis.status === 'processing'
                          ? 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      <FileText className={`w-[18px] h-[18px] ${
                        analysis.status === 'completed' ? 'text-emerald-500' :
                        analysis.status === 'processing' ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {analysis.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="truncate">{analysis.bank ?? 'Banco no detectado'}</span>
                        <span className="text-gray-400 dark:text-gray-400">·</span>
                        <span className="whitespace-nowrap">{formatDate(analysis.created_at)}</span>
                      </div>
                      {analysis.period_start && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5 sm:hidden flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(analysis.period_start)} – {formatDate(analysis.period_end!)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center justify-end">
                    <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300 font-mono">{analysis.total_transactions}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Anomalías</span>
                    <span className={`text-sm font-semibold tabular-nums ${
                      analysis.anomalies_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {analysis.anomalies_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Recuperable</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatCLP(analysis.recoverable_amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-center">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Estado</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${
                      analysis.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                      analysis.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                      'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                    }`}>
                      {analysis.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : analysis.status === 'processing' ? (
                        <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {analysis.status === 'completed' ? 'Completado' : analysis.status === 'processing' ? 'Procesando' : 'Error'}
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center justify-center">
                    <DeleteAnalysisButton id={analysis.id} fileName={analysis.file_name} />
                  </div>
                </div>
              )

              if (isClickable) {
                return (
                  <Link key={analysis.id} href={`/historial/${analysis.id}`}>
                    {content}
                  </Link>
                )
              }
              return <div key={analysis.id}>{content}</div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
