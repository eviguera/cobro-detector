'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Landmark, Loader2, Scale, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/product-events'
import { cn } from '@/lib/utils'

type ClaimStatus = 'draft' | 'sent' | 'responded' | 'escalated'

export interface ClaimRow {
  status: ClaimStatus
  sent_at: string | null
  response_at: string | null
  notes: string | null
}

interface ClaimTrackerProps {
  analysisId: string
  initial: ClaimRow | null
}

const STEPS: Array<{ value: ClaimStatus; label: string; icon: typeof Send }> = [
  { value: 'draft', label: 'Carta lista', icon: CheckCircle2 },
  { value: 'sent', label: 'Enviada al banco', icon: Send },
  { value: 'responded', label: 'Respuesta recibida', icon: Landmark },
  { value: 'escalated', label: 'Escalada a la CMF', icon: Scale },
]

function businessDaysSince(date: string | null): number {
  if (!date) return 0
  const start = new Date(date)
  const today = new Date()
  if (Number.isNaN(start.getTime()) || start > today) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor < today) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

export function ClaimTracker({ analysisId, initial }: ClaimTrackerProps) {
  const [status, setStatus] = useState<ClaimStatus>(initial?.status ?? 'draft')
  const [sentAt, setSentAt] = useState<string | null>(initial?.sent_at ?? null)
  const [responseAt, setResponseAt] = useState<string | null>(initial?.response_at ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const elapsed = useMemo(() => businessDaysSince(sentAt), [sentAt])
  const overdue = status === 'sent' && elapsed >= 10

  const save = async (next: {
    status: ClaimStatus
    sent_at?: string | null
    response_at?: string | null
    notes?: string
  }) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.')
        return
      }

      const { error } = await supabase.from('claim_tracking').upsert(
        {
          analysis_id: analysisId,
          user_id: user.id,
          status: next.status,
          sent_at: next.sent_at ?? sentAt,
          response_at: next.response_at ?? responseAt,
          notes: next.notes ?? notes,
        },
        { onConflict: 'analysis_id' }
      )

      if (error) {
        toast.error('No pudimos guardar el seguimiento. Intenta de nuevo.')
        return
      }

      setStatus(next.status)
      if (next.sent_at !== undefined) setSentAt(next.sent_at)
      if (next.response_at !== undefined) setResponseAt(next.response_at)
      if (next.notes !== undefined) setNotes(next.notes)
      void trackEvent('claim_status_changed', { analysis_id: analysisId, status: next.status })
      toast.success('Seguimiento actualizado')
    } catch {
      toast.error('No pudimos guardar el seguimiento. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const currentIndex = STEPS.findIndex((step) => step.value === status)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="claim-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="claim-title" className="font-display text-base font-semibold tracking-tight">
            Seguimiento del reclamo
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            El banco tiene 10 días hábiles para responder. Registra aquí cada paso.
          </p>
        </div>
        {saving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const active = index <= currentIndex
          const Icon = step.icon
          return (
            <li
              key={step.value}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-medium',
                active
                  ? 'border-primary/25 bg-accent text-accent-foreground'
                  : 'border-border bg-secondary/30 text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {step.label}
            </li>
          )
        })}
      </ol>

      {status === 'sent' ? (
        <p
          className={cn(
            'mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px]',
            overdue
              ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500'
              : 'bg-secondary/40 text-muted-foreground'
          )}
        >
          <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
          {overdue
            ? `Han pasado ${elapsed} días hábiles. Si el banco no respondió, puedes escalar a la CMF.`
            : `Enviada hace ${elapsed} día${elapsed === 1 ? '' : 's'} hábil${elapsed === 1 ? '' : 'es'}.`}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === 'draft' ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => save({ status: 'sent', sent_at: new Date().toISOString() })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar como enviada
          </button>
        ) : null}

        {status === 'sent' ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ status: 'responded', response_at: new Date().toISOString() })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
              El banco respondió
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ status: 'escalated' })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warning-200 bg-warning-50 px-3 text-xs font-semibold text-warning-700 transition-colors hover:bg-warning-100 disabled:opacity-60 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-500"
            >
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              Escalar a la CMF
            </button>
          </>
        ) : null}

        {status === 'responded' ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => save({ status: 'escalated' })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warning-200 bg-warning-50 px-3 text-xs font-semibold text-warning-700 transition-colors hover:bg-warning-100 disabled:opacity-60 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-500"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            No me dieron solución: escalar a la CMF
          </button>
        ) : null}

        {status === 'escalated' ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success-600 dark:text-success-500" aria-hidden="true" />
            Caso escalado. Guarda el número de caso de la CMF en tus notas.
          </p>
        ) : null}
      </div>

      <label htmlFor={`claim-notes-${analysisId}`} className="sr-only">
        Notas del reclamo
      </label>
      <textarea
        id={`claim-notes-${analysisId}`}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== (initial?.notes ?? '')) void save({ status, notes })
        }}
        rows={2}
        maxLength={1000}
        placeholder="Número de caso, nombre del ejecutivo, respuesta del banco…"
        className="mt-3 w-full resize-y rounded-xl border border-input bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </section>
  )
}
