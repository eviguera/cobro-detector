'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import { ANOMALY_TYPES, SEVERITY } from '@/lib/constants'
import type { Finding, FindingGroup, Severity } from '@/lib/analysis-insights'
import { FindingFeedback } from './finding-feedback'
import { useReportSelection } from './report-selection'
import { findingKey } from '@/lib/finding-key'
import { bankClaimChannel } from '@/lib/claim-channels'
import { cn } from '@/lib/utils'

interface FindingsExplorerProps {
  findings: Finding[]
  groups: FindingGroup[]
  /** Si se entrega, cada hallazgo puede reportarse como falso positivo. */
  analysisId?: string
  /** Banco del análisis para indicar el canal de reclamo correcto. */
  bank?: string | null
}

type SeverityFilter = 'all' | Severity
type SortKey = 'severity' | 'amount'

const PAGE_SIZE = 25

const CLAIM_INSTRUCTIONS: Record<string, string> = {
  duplicate_commission:
    'La comisión de crédito se cobra una vez. Pide el reverso de las cuotas repetidas citando la comisión de apertura original.',
  duplicate_charge:
    'El mismo cargo aparece más de una vez en pocos días. Pide el reverso de los cobros duplicados y adjunta este detalle.',
  installment_error:
    'Solicita el recálculo de cuotas. Adjunta el comprobante de la venta pactada en cuotas sin interés.',
  unknown_charge:
    'Pide el detalle del cargo por escrito. Si no pueden justificarlo, exige el reverso inmediato.',
  incorrect_charge:
    'Compara el cobro con tus registros. Si no corresponde, solicita el reverso del cargo.',
}

const SEVERITY_BADGE: Record<Severity, string> = {
  high: 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/15 dark:text-danger-500',
  medium:
    'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-500',
  low: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300',
}

export function FindingsExplorer({ findings, groups, analysisId, bank }: FindingsExplorerProps) {
  const selection = useReportSelection()
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [sort, setSort] = useState<SortKey>('severity')
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  // Con cartolas reales puede haber cientos de hallazgos: renderizar todos
  // bloquea el navegador. Mostramos por tandas.
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const rows = findings.filter((finding) => {
      const matchesSeverity = severity === 'all' || finding.severity === severity
      if (!matchesSeverity) return false
      if (!term) return true
      return (
        finding.title.toLowerCase().includes(term) ||
        finding.description.toLowerCase().includes(term) ||
        (finding.detail ?? '').toLowerCase().includes(term)
      )
    })

    return [...rows].sort((a, b) => {
      if (sort === 'amount') return b.amount - a.amount
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.severity] - rank[b.severity] || b.amount - a.amount
    })
  }, [findings, query, severity, sort])

  const filteredTotal = filtered.reduce((sum, finding) => sum + finding.amount, 0)
  const shown = filtered.slice(0, visible)
  const hasFilters = query.trim() !== '' || severity !== 'all'

  return (
    <section aria-labelledby="hallazgos-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="hallazgos-title" className="text-lg font-semibold tracking-tight">
            Cobros detectados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {findings.length} hallazgo{findings.length === 1 ? '' : 's'} ·{' '}
            <span className="font-mono font-medium text-foreground">{formatCLP(filteredTotal)}</span> en esta vista
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Buscar en los cobros detectados</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE) }}
              placeholder="Buscar cobro…"
              className="h-9 w-full rounded-xl border border-input bg-card pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            )}
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Filtrar por prioridad</span>
            <select
              value={severity}
              onChange={(event) => { setSeverity(event.target.value as SeverityFilter); setVisible(PAGE_SIZE) }}
              className="h-9 rounded-xl border border-input bg-card px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">Ordenar hallazgos</span>
            <select
              value={sort}
              onChange={(event) => { setSort(event.target.value as SortKey); setVisible(PAGE_SIZE) }}
              className="h-9 rounded-xl border border-input bg-card px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="severity">Mayor prioridad</option>
              <option value="amount">Mayor monto</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{selection.selectedCount}</span> de{' '}
          {selection.totalCount} incluidos en la carta
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selection.selectAll}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Incluir todos
          </button>
          <span className="text-border" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={selection.selectNone}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Quitar todos
          </button>
        </div>
      </div>

      {/* Resumen por categoría: funciona como filtro rápido y como lectura del hallazgo */}
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Resumen por tipo de cobro">
          {groups.map((group) => (
            <span
              key={group.type}
              role="listitem"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-foreground">{group.label}</span>
              <span className="text-muted-foreground">
                {group.count} · {formatCLP(group.amount)}
              </span>
              <span className="font-mono text-2xs text-muted-foreground">{group.share}%</span>
            </span>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-success-500" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? 'Ningún cobro coincide con el filtro' : 'Sin cobros en esta categoría'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {hasFilters
              ? 'Prueba con otra prioridad o limpia la búsqueda.'
              : 'No encontramos cobros que cumplan los criterios de este tipo.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSeverity('all')
              }}
              className="mt-4 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((finding) => {
            const index = findings.indexOf(finding)
            const isOpen = openIndex === index
            const panelId = `finding-panel-${index}`
            const severityInfo = SEVERITY[finding.severity]
            const key = findingKey(finding)
            const selected = selection.isSelected(key)

            return (
              <li key={`${finding.type}-${finding.title}-${index}`} className="print-block">
                <article
                  className={cn(
                    'relative overflow-hidden rounded-2xl border bg-card shadow-card transition-colors',
                    finding.severity === 'high'
                      ? 'border-danger-200/70 dark:border-danger-500/25'
                      : finding.severity === 'medium'
                        ? 'border-warning-200/70 dark:border-warning-500/25'
                        : 'border-border'
                  )}
                >
                  <label
                    className="absolute left-3 top-4 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border bg-card"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => selection.toggle(key)}
                      className="h-3.5 w-3.5 accent-primary"
                      aria-label={`Incluir "${finding.title}" en la carta`}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-start gap-3 p-4 pl-12 text-left transition-colors hover:bg-muted/40 sm:p-5 sm:pl-12"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1 h-9 w-1 shrink-0 rounded-full',
                        finding.severity === 'high'
                          ? 'bg-danger-500'
                          : finding.severity === 'medium'
                            ? 'bg-warning-500'
                            : 'bg-brand-500'
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-5 items-center rounded-full border px-2 text-2xs font-semibold',
                            SEVERITY_BADGE[finding.severity]
                          )}
                        >
                          {severityInfo?.label ?? finding.severity}
                        </span>
                        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                          {finding.type === 'duplicate_commission'
                            ? 'Comisión duplicada'
                            : finding.type === 'installment_error'
                              ? 'Error en cuotas'
                              : finding.type === 'unknown_charge'
                                ? 'Cargo no reconocido'
                                : finding.type === 'incorrect_charge'
                                  ? 'Cobro incorrecto'
                                  : ANOMALY_TYPES[finding.type] ?? finding.type}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-sm font-semibold text-foreground">{finding.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {finding.description}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-display text-base font-semibold tabular-nums text-foreground">
                        {formatCLP(finding.amount)}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {finding.transactionRefs.length} respaldo{finding.transactionRefs.length === 1 ? '' : 's'}
                      </span>
                      <ChevronDown
                        className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <div id={panelId} className="border-t border-border bg-surface-muted/50 px-4 py-4 sm:px-5">
                      {finding.detail && (
                        <p className="mb-3 rounded-xl bg-card px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                          {finding.detail}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                        <div>
                          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Cómo reclamarlo
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground">
                            {CLAIM_INSTRUCTIONS[finding.type] ??
                              'Presenta este reporte en el banco y solicita el reverso del cargo.'}{' '}
                            Canal: {bankClaimChannel(bank)}.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5">
                          <Sparkles className="h-3 w-3 text-brand-500" aria-hidden="true" />
                          <span className="text-2xs font-medium text-muted-foreground">Confianza</span>
                          <span className="font-mono text-xs font-semibold text-foreground">{finding.confidence}%</span>
                        </div>
                      </div>

                      {analysisId ? (
                        <FindingFeedback analysisId={analysisId} finding={finding} severity={finding.severity} />
                      ) : null}

                      {finding.transactionRefs.length > 0 && (
                        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-success-500" aria-hidden="true" />
                          Transacciones vinculadas:
                          {finding.transactionRefs.slice(0, 6).map((ref) => (
                            <code key={ref} className="rounded bg-card px-1.5 py-0.5 font-mono text-foreground">
                              {ref}
                            </code>
                          ))}
                          {finding.transactionRefs.length > 6 && <span>+{finding.transactionRefs.length - 6}</span>}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {filtered.length > visible && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {shown.length} de {filtered.length} hallazgos
          </p>
          <button
            type="button"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            Mostrar {Math.min(PAGE_SIZE, filtered.length - visible)} más
          </button>
        </div>
      )}

      {filtered.length > 0 && findings.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Los montos son una estimación del monto reclamable. El banco valida cada caso con su propio registro.
        </p>
      )}
    </section>
  )
}
