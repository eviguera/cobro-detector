import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSearch,
  FileText,
  Plus,
  Search,
} from 'lucide-react'
import { formatCLP, formatDate } from '@/lib/utils'
import { filterValidAnalyses, sumAnomalies, sumRecoverable } from '@/lib/analysis-metrics'
import type { Analysis } from '@/domain'
import { PageHeader } from '@/components/ui/page-header'
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

function getStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'completed':
      return { label: 'Completado', tone: 'success' }
    case 'awaiting_payment':
      return { label: 'Por pagar', tone: 'warning' }
    case 'processing':
    case 'pending':
      return { label: 'Procesando', tone: 'info' }
    case 'error':
    case 'failed':
      return { label: 'Error', tone: 'danger' }
    default:
      return { label: status, tone: 'muted' }
  }
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
  info: 'bg-accent text-accent-foreground',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
  muted: 'bg-secondary text-muted-foreground',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
  if (status === 'awaiting_payment') return <CreditCard className="h-3 w-3" aria-hidden="true" />
  if (status === 'processing' || status === 'pending') {
    return <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
  }
  return <AlertTriangle className="h-3 w-3" aria-hidden="true" />
}

interface Props {
  searchParams: { periodo?: string; q?: string; page?: string }
}

export const metadata: Metadata = { title: 'Historial de análisis' }

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

  // Un análisis fallido no representa dinero recuperable ni anomalías reales.
  const validAnalyses = filterValidAnalyses(analyses)
  const totalRecoverable = sumRecoverable(validAnalyses)
  const totalAnomalies = sumAnomalies(validAnalyses)
  const completedCount = analyses.filter((a) => a.status === 'completed').length
  const pendingPayment = analyses.filter((a) => a.status === 'awaiting_payment').length

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
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Historial"
        title="Mis cartolas"
        description={
          <span>
            {analyses.length} cartola{analyses.length !== 1 ? 's' : ''} · {completedCount} completada{completedCount !== 1 ? 's' : ''}
            {pendingPayment > 0 ? ` · ${pendingPayment} por pagar` : ''} · {formatCLP(totalRecoverable)} recuperable
          </span>
        }
        actions={
          <Link
            href="/analisis"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo análisis
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Cartolas', value: String(analyses.length), sub: 'subidas' },
          { label: 'Hallazgos', value: String(totalAnomalies), sub: 'en análisis válidos', danger: totalAnomalies > 0 },
          { label: 'Recuperable', value: formatCLP(totalRecoverable), sub: 'estimado' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-2xs">{metric.label}</p>
            <p
              className={`num-display mt-2 break-words font-semibold tracking-tight ${
                metric.label === 'Recuperable' ? 'text-sm sm:text-xl' : 'text-lg sm:text-xl'
              } ${metric.danger ? 'text-danger-600 dark:text-danger-500' : 'text-foreground'}`}
            >
              {metric.value}
            </p>
            <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">{metric.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form action="/historial" method="get" className="relative max-w-md flex-1" role="search">
          {periodo !== 'todas' ? <input type="hidden" name="periodo" value={periodo} /> : null}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre de archivo…"
            aria-label="Buscar análisis por nombre de archivo"
            className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/92"
          >
            Buscar
          </button>
        </form>
        <div className="flex items-center gap-2">
          <FilterBar current={periodo as 'todas' | 'semana' | 'mes' | 'ano'} q={q} />
          {q ? (
            <Link href={buildHref({ q: undefined, page: undefined })} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Limpiar
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-500/25 dark:bg-danger-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600 dark:text-danger-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-danger-700 dark:text-danger-500">No pudimos cargar tu historial</p>
            <p className="mt-0.5 text-xs text-danger-700/80 dark:text-danger-500/80">
              Revisa tu conexión e intenta de nuevo. Tus análisis no se perdieron.
            </p>
          </div>
        </div>
      ) : null}

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="font-display text-base font-semibold text-foreground">
            {q
              ? 'Sin resultados para tu búsqueda'
              : periodo !== 'todas'
                ? 'Sin cartolas en este período'
                : 'Aún no has analizado ninguna cartola'}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {q
              ? `No encontramos cartolas que coincidan con «${q}». Revisa el nombre del archivo o quita el filtro.`
              : periodo !== 'todas'
                ? 'Prueba con otro período o quita el filtro.'
                : 'Sube tu primera cartola y en menos de 3 minutos sabrás si tu banco te cobró de más.'}
          </p>
          <Link
            href={q || periodo !== 'todas' ? '/historial' : '/analisis'}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          >
            {q || periodo !== 'todas' ? (
              'Ver todas las cartolas'
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Subir mi primera cartola
              </>
            )}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden border-b border-border bg-secondary/40 px-5 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_90px_90px_120px_110px_40px] sm:gap-4">
            {['Archivo', 'Movimientos', 'Hallazgos', 'Recuperable', 'Estado', ''].map((label, index) => (
              <span
                key={`${label}-${index}`}
                className={`eyebrow ${index >= 1 && index <= 3 ? 'text-right' : index === 4 ? 'text-center' : ''}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="divide-y divide-border/70">
            {pageAnalyses.map((analysis) => {
              const meta = getStatusMeta(analysis.status)
              const isInvalid = analysis.status === 'error' || analysis.status === 'failed'
              const hasFindings = !isInvalid && (analysis.anomalies_count ?? 0) > 0

              return (
                <div
                  key={analysis.id}
                  className="group relative flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-secondary/30 sm:grid sm:grid-cols-[minmax(0,1fr)_90px_90px_120px_110px_40px] sm:items-center sm:gap-4 sm:px-5"
                >
                  <Link href={`/historial/${analysis.id}`} className="absolute inset-0 z-0" aria-label={`Ver análisis ${analysis.file_name}`} />

                  <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        analysis.status === 'completed'
                          ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500'
                          : analysis.status === 'awaiting_payment'
                            ? 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500'
                            : analysis.status === 'processing'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {analysis.file_name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {analysis.bank ?? 'Banco no detectado'} · {formatDate(analysis.created_at)}
                      </span>
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 flex items-center justify-between gap-3 sm:hidden">
                    <span className="num text-xs text-muted-foreground">
                      {isInvalid ? 'Sin datos' : `${analysis.anomalies_count ?? 0} hallazgos · ${formatCLP(analysis.recoverable_amount ?? 0)}`}
                    </span>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-semibold ${toneClasses[meta.tone]}`}>
                      <StatusIcon status={analysis.status} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 hidden justify-end sm:flex">
                    <span className="num text-xs text-muted-foreground">{analysis.total_transactions}</span>
                  </div>

                  <div className="pointer-events-none relative z-10 hidden items-center justify-end sm:flex">
                    <span className="text-[11px] text-muted-foreground sm:hidden">Hallazgos</span>
                    <span
                      className={`num text-sm font-semibold ${
                        isInvalid
                          ? 'text-muted-foreground'
                          : hasFindings
                            ? 'text-danger-600 dark:text-danger-500'
                            : 'text-success-600 dark:text-success-500'
                      }`}
                    >
                      {isInvalid ? '—' : analysis.anomalies_count ?? 0}
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 hidden items-center justify-end sm:flex">
                    <span className="text-[11px] text-muted-foreground sm:hidden">Recuperable</span>
                    <span className="num text-sm font-semibold text-foreground">
                      {isInvalid ? '—' : formatCLP(analysis.recoverable_amount ?? 0)}
                    </span>
                  </div>

                  <div className="pointer-events-none relative z-10 hidden items-center justify-center sm:flex">
                    <span className="text-[11px] text-muted-foreground sm:hidden">Estado</span>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-semibold ${toneClasses[meta.tone]}`}>
                      <StatusIcon status={analysis.status} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="relative z-20 flex items-center justify-end sm:justify-center">
                    <DeleteAnalysisButton id={analysis.id} fileName={analysis.file_name} />
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link href={buildHref({ page: String(currentPage - 1) })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Anterior
                  </Link>
                ) : (
                  <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground/50">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Anterior
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link href={buildHref({ page: String(currentPage + 1) })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                    Siguiente <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground/50">
                    Siguiente <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
