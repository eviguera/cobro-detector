'use client'

import { useMemo, useState } from 'react'
import { ArrowDownUp, Search } from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
}

interface TransactionsTableProps {
  transactions: Transaction[]
  flaggedIds: string[]
}

type Filter = 'all' | 'flagged' | 'ok'

const PAGE = 40

export function TransactionsTable({ transactions, flaggedIds }: TransactionsTableProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [descending, setDescending] = useState(true)
  const [visible, setVisible] = useState(PAGE)

  const flagged = useMemo(() => new Set(flaggedIds), [flaggedIds])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = transactions.filter((tx) => {
      const isFlagged = flagged.has(tx.id)
      if (filter === 'flagged' && !isFlagged) return false
      if (filter === 'ok' && isFlagged) return false
      if (!term) return true
      return tx.description.toLowerCase().includes(term) || tx.date.includes(term)
    })

    return [...filtered].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return descending ? -diff : diff
    })
  }, [transactions, flagged, filter, query, descending])

  const flaggedCount = flaggedIds.length
  const shown = rows.slice(0, visible)

  return (
    <section aria-labelledby="transacciones-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 id="transacciones-title" className="text-lg font-semibold tracking-tight">
            Transacciones analizadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length} movimientos · {flaggedCount} marcado{flaggedCount === 1 ? '' : 's'} para revisión
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Buscar transacción</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setVisible(PAGE)
              }}
              placeholder="Buscar descripción o fecha…"
              className="h-9 w-full rounded-xl border border-input bg-card pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
            />
          </label>

          <div className="flex rounded-xl border border-border p-0.5" role="group" aria-label="Filtrar transacciones">
            {(
              [
                ['all', 'Todas'],
                ['flagged', 'Revisar'],
                ['ok', 'OK'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value)
                  setVisible(PAGE)
                }}
                aria-pressed={filter === value}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-xs font-medium transition-colors',
                  filter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDescending((current) => !current)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
            {descending ? 'Recientes' : 'Antiguas'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Transacciones del estado de cuenta con su estado de revisión</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha
              </th>
              <th scope="col" className="px-5 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descripción
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monto
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((tx) => {
              const isFlagged = flagged.has(tx.id)
              return (
                <tr
                  key={tx.id}
                  className={cn(
                    'border-b border-border/60 last:border-0 transition-colors hover:bg-muted/40',
                    isFlagged && 'bg-danger-50/70 dark:bg-danger-500/10'
                  )}
                >
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">{tx.date}</td>
                  <td className="max-w-[22rem] px-5 py-3">
                    <span className="block truncate text-foreground" title={tx.description}>
                      {tx.description}
                    </span>
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-5 py-3 text-right font-mono text-xs tabular-nums',
                      tx.amount < 0 ? 'text-danger-600 dark:text-danger-500' : 'text-success-600 dark:text-success-500'
                    )}
                  >
                    {tx.amount < 0 ? '−' : '+'}
                    {formatCLP(Math.abs(tx.amount))}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isFlagged ? (
                      <span className="inline-flex items-center rounded-full bg-danger-100 px-2 py-0.5 text-2xs font-semibold text-danger-700 dark:bg-danger-500/20 dark:text-danger-500">
                        Revisar
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-2xs font-semibold text-success-700 dark:bg-success-500/20 dark:text-success-500">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No hay transacciones que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {shown.length} de {rows.length}
          </p>
          {visible < rows.length && (
            <button
              type="button"
              onClick={() => setVisible((current) => current + PAGE)}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              Mostrar más
            </button>
          )}
        </div>
      )}

      <p className="no-print border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Las filas marcadas como <strong className="text-foreground">Revisar</strong> son las que respaldan un cobro
        reclamable.
      </p>
    </section>
  )
}
