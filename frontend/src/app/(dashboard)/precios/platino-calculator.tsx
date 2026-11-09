'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Calculator } from 'lucide-react'
import { formatCLP } from '@/lib/utils'

const MAX = 2_000_000
const STEP = 10_000

export function PlatinoCalculator() {
  const [recoverable, setRecoverable] = useState(200_000)

  const fee = useMemo(() => Math.round(recoverable * 0.2), [recoverable])
  const net = Math.max(0, recoverable - fee)

  return (
    <section
      aria-labelledby="calc-title"
      className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Calculator className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 id="calc-title" className="font-display text-lg font-semibold tracking-tight">
            Calcula tu Plan Platino
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Sin costo fijo. Pagas el 20% de lo que efectivamente recuperes.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <label htmlFor="recoverable" className="text-xs font-medium text-foreground">
            ¿Cuánto crees que podrías recuperar?
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="recoverable"
              type="range"
              min={0}
              max={MAX}
              step={STEP}
              value={recoverable}
              onChange={(event) => setRecoverable(Number(event.target.value))}
              className="h-2 w-full accent-primary"
              aria-valuetext={`${formatCLP(recoverable)} recuperables`}
            />
            <span className="num w-28 shrink-0 text-right text-sm font-semibold text-foreground">
              {formatCLP(recoverable)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>$0</span>
            <span>{formatCLP(MAX)}</span>
          </div>
        </div>

        <dl className="divide-y divide-border/70 rounded-xl border border-border bg-secondary/30 px-4">
          <div className="data-row">
            <dt className="text-muted-foreground">Recuperas</dt>
            <dd className="num font-semibold text-foreground">{formatCLP(recoverable)}</dd>
          </div>
          <div className="data-row">
            <dt className="text-muted-foreground">Pagas a CobroDetector</dt>
            <dd className="num font-semibold text-foreground">{formatCLP(fee)}</dd>
          </div>
          <div className="data-row">
            <dt className="font-semibold text-foreground">Te queda</dt>
            <dd className="num-display text-xl font-semibold text-success-600 dark:text-success-500">
              {formatCLP(net)}
            </dd>
          </div>
        </dl>
      </div>

      <a
        href="/analisis?plan=platino"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-px hover:shadow-md"
      >
        Analizar con Plan Platino
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  )
}
