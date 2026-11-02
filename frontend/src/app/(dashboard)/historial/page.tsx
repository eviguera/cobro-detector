import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileSearch, Plus, AlertTriangle, CheckCircle2, FileText, CalendarDays, Search, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import { formatCLP, formatDate } from '@/lib/utils'
import type { Analysis } from '@/domain'
import FilterBar from './filter-bar'
import DeleteAnalysisButton from './delete-button'

const PAGE_SIZE = 10

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

async function getAnalysesData(userId: string, desde?: string, hasta?: string, q?: string) {
  const supabase = await createClient()
  // Solo columnas de listado: `raw_data` puede traer miles de transacciones
  // y no se necesita para pintar la tabla.
  let query = supabase
    .from('analyses')
    .select('id, user_id, file_name, bank, status, total_transactions, anomalies_count, recoverable_amount, created_at, period_start, period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)
  if (q) query = query.ilike('file_name', `%${q}%`)

  const { data, error } = await query
  return { analyses: data as unknown as Analysis[] | null, error }
}

type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'muted'

function getStatusMeta(status: string): { label: string; tone: StatusTone; hint: string } {
  switch (status) {
    case 'completed':
      return { label: 'Completado', tone: 'success', hint: 'Ver reporte' }
    case 'awaiting_payment':
      return { label: 'Pendiente de pago', tone: 'warning', hint: 'Pagar 20%' }
    case 'processing':
    case 'pending':
      return { label: 'Procesando', tone: 'info', hint: 'Ver progreso' }
    case 'error':
    case 'failed':
      return { label: 'Error', tone: 'danger', hint: 'Reintentar' }
    default:
      return { label: status, tone: 'muted', hint: 'Ver detalle' }
  }
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  muted: 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="w-3 h-3" />
  if (status === 'awaiting_payment') return <CreditCard className="w-3 h-3" />
  if (status === 'processing' || status === 'pending') {
    return <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
  }
  return <AlertTriangle className="w-3 h-3" />
}

interface Props {
  searchParams: { periodo?: string; q?: string; page?: string }
}

export default async function HistorialPage({ searchParams }: Props) {
  const periodo = searchParams.periodo ?? 'todas'
  const q = (searchParams.q ?? '').trim()
  const requestedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const dateRange = getPeriodoDates(periodo)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { analyses: allAnalyses, error } = await getAnalysesData(user.id, dateRange?.desde, dateRange?.hasta, q || undefined)
  const analyses = allAnalyses ?? []

  // Los análisis fallidos no representan dinero recuperable.
  const totalRecoverable = analyses
    .filter(a => a.status !== 'failed' && a.status !== 'error')
    .reduce((sum, a) => sum + (a.recoverable_amount ?? 0), 0)
  const totalAnomalies = analyses.reduce((sum, a) => sum + (a.anomalies_count ?? 0), 0)
  const completedCount = analyses.filter(a => a.status === 'completed').length
  const pendingPayment = analyses.filter(a => a.status === 'awaiting_payment').length

  const totalPages = Math.max(1, Math.ceil(analyses.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), totalPages)
  const pageAnalyses = analyses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const values = { periodo, q, page: String(currentPage), ...overrides }
    if (values.periodo && values.periodo !== 'todas') params.set('periodo', values.periodo)
    if (values.q) params.set('q', values.q)
    if (values.page && values.page !== '1') params.set('page', values.page)
    const query = params.toString()
    return query ? `/historial?${query}` : '/historial'
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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
              {analyses.length} análisis · {completedCount} completados
              {pendingPayment > 0 ? ` · ${pendingPayment} por pagar` : ''} · {formatCLP(totalRecoverable)} recuperable
            </p>
          </div>
          <Link
            href="/analisis"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            Nuevo análisis
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <form action="/historial" method="get" className="relative flex-1 max-w-md" role="search">
            {periodo !== 'todas' && <input type="hidden" name="periodo" value={periodo} />}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre de archivo..."
              aria-label="Buscar análisis por nombre de archivo"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700/50 dark:bg-gray-900/60 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-600"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Buscar
            </button>
          </form>
          <div className="flex items-center gap-2">
            <FilterBar current={periodo as 'todas' | 'semana' | 'mes' | 'ano'} q={q} />
            {q && (
              <Link
                href={buildHref({ q: undefined, page: undefined })}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Limpiar búsqueda
              </Link>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/40 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">No pudimos cargar tu historial</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
              Revisa tu conexión e intenta de nuevo. Tus análisis no se perdieron.
            </p>
          </div>
        </div>
      )}

      {analyses.length > 0 && (
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

      {analyses.length === 0 ? (
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 text-center py-20 px-6 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 flex items-center justify-center shadow-inner">
            <FileSearch className="w-7 h-7 text-gray-400 dark:text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {q
              ? 'Sin resultados para tu búsqueda'
              : periodo !== 'todas'
                ? 'Sin análisis en este período'
                : 'No tienes análisis aún'}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
            {q
              ? `No encontramos archivos que coincidan con “${q}”. Prueba con otro término.`
              : periodo !== 'todas'
                ? 'No se encontraron análisis en el período seleccionado. Prueba con otro filtro.'
                : 'Sube tu estado de cuenta para comenzar a detectar cobros incorrectos'}
          </p>
          {q || periodo !== 'todas' ? (
            <Link
              href="/historial"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30"
            >
              Ver todos los análisis
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
          <div className="hidden sm:grid grid-cols-[1fr_100px_90px_110px_120px_50px] gap-4 px-6 py-3 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800/30">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Archivo</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Transacciones</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Anomalías</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Recuperable</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Estado</span>
            <span />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
            {pageAnalyses.map((analysis, i) => {
              const meta = getStatusMeta(analysis.status)
              const href = `/historial/${analysis.id}`

              return (
                <div
                  key={analysis.id}
                  className="group relative flex flex-col sm:grid sm:grid-cols-[1fr_100px_90px_110px_120px_50px] gap-3 sm:gap-4 px-5 sm:px-6 py-4 transition-all duration-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Enlace que cubre la fila sin anidar el botón de borrado */}
                  <Link href={href} className="absolute inset-0 z-0" aria-label={`Ver análisis ${analysis.file_name}`} />

                  <div className="pointer-events-none relative z-10 flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      analysis.status === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                        : analysis.status === 'processing'
                          ? 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                          : analysis.status === 'awaiting_payment'
                            ? 'bg-amber-50 dark:bg-amber-900/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30'
                            : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      <FileText className={`w-[18px] h-[18px] ${
                        analysis.status === 'completed' ? 'text-emerald-500' :
                        analysis.status === 'processing' ? 'text-blue-500' :
                        analysis.status === 'awaiting_payment' ? 'text-amber-500' : 'text-gray-400'
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

                  <div className="pointer-events-none relative z-10 hidden sm:flex items-center justify-end">
                    <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300 font-mono">{analysis.total_transactions}</span>
                  </div>

                  <div className="pointer-events-none relative z-10 flex items-center justify-between sm:justify-end">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Anomalías</span>
                    <span className={`text-sm font-semibold tabular-nums ${
                      analysis.anomalies_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {analysis.anomalies_count}
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 flex items-center justify-between sm:justify-end">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Recuperable</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatCLP(analysis.recoverable_amount)}
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 flex items-center justify-between sm:justify-center">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden font-medium">Estado</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${toneClasses[meta.tone]}`}>
                      <StatusIcon status={analysis.status} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="relative z-20 flex items-center justify-end sm:justify-center">
                    <DeleteAnalysisButton id={analysis.id} fileName={analysis.file_name} />
                  </div>

                  {meta.hint && (
                    <span className="pointer-events-none relative z-10 text-[10px] text-gray-400 dark:text-gray-500 sm:hidden">
                      {meta.hint} →
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800/30 sm:px-6">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildHref({ page: String(currentPage - 1) })}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-300 dark:border-gray-800 dark:text-gray-600">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildHref({ page: String(currentPage + 1) })}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                  >
                    Siguiente
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-300 dark:border-gray-800 dark:text-gray-600">
                    Siguiente
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
