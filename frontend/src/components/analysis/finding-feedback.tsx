'use client'

import { useState } from 'react'
import { CheckCircle2, Flag, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Finding, Severity } from '@/lib/analysis-insights'
import { findingKey } from '@/lib/finding-key'

const REASONS = [
  { value: 'not_applicable', label: 'El cobro sí corresponde' },
  { value: 'legitimate', label: 'Es un cobro legítimo que reconozco' },
  { value: 'wrong_amount', label: 'El monto no es correcto' },
  { value: 'already_charged', label: 'Ya me lo devolvieron' },
  { value: 'other', label: 'Otro motivo' },
] as const

interface FindingFeedbackProps {
  analysisId: string
  finding: Finding
  severity: Severity
}

/**
 * Feedback del usuario sobre un hallazgo. Es la señal que permite medir
 * falsos positivos y calibrar el motor con datos reales.
 */
export function FindingFeedback({ analysisId, finding, severity }: FindingFeedbackProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('not_applicable')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const fieldId = findingKey(finding).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || done) return
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

      const { error } = await supabase.from('anomaly_feedback').upsert(
        {
          analysis_id: analysisId,
          user_id: user.id,
          anomaly_key: findingKey(finding),
          anomaly_type: finding.type,
          severity,
          reason,
          comment: comment.trim() || null,
        },
        { onConflict: 'user_id,analysis_id,anomaly_key' }
      )

      if (error) {
        toast.error('No pudimos guardar tu comentario. Intenta de nuevo.')
        return
      }

      setDone(true)
      setOpen(false)
      toast.success('Gracias. Revisaremos este hallazgo para mejorar el análisis.')
    } catch {
      toast.error('No pudimos guardar tu comentario. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <p
        role="status"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-success-200 bg-success-50 px-2.5 py-1.5 text-2xs font-medium text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500"
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Gracias, lo revisaremos
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-2xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        No corresponde
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-xl border border-border bg-card p-3"
      aria-label="Reportar hallazgo incorrecto"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">¿Por qué no corresponde?</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar formulario"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <label htmlFor={`reason-${fieldId}`} className="sr-only">
        Motivo
      </label>
      <select
        id={`reason-${fieldId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mt-2 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {REASONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <label htmlFor={`comment-${fieldId}`} className="sr-only">
        Comentario opcional
      </label>
      <input
        id={`comment-${fieldId}`}
        type="text"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Comentario opcional"
        maxLength={280}
        className="mt-2 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <button
        type="submit"
        disabled={saving}
        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        Enviar comentario
      </button>
    </form>
  )
}
