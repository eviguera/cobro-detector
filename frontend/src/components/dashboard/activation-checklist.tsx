import Link from 'next/link'
import { CheckCircle2, Circle, Download, FileSearch, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivationChecklistProps {
  hasAnalyses: boolean
  hasFindings: boolean
  latestAnalysisId: string | null
}

export function ActivationChecklist({
  hasAnalyses,
  hasFindings,
  latestAnalysisId,
}: ActivationChecklistProps) {
  const steps = [
    {
      label: 'Sube tu primera cartola',
      hint: 'PDF, Excel o CSV del banco',
      done: hasAnalyses,
      href: '/analisis',
      icon: FileSearch,
      cta: 'Subir cartola',
    },
    {
      label: 'Revisa tus hallazgos',
      hint: 'Con evidencia y confianza',
      done: hasFindings,
      href: latestAnalysisId ? `/historial/${latestAnalysisId}` : '/analisis',
      icon: ListChecks,
      cta: 'Ver hallazgos',
    },
    {
      label: 'Descarga la carta',
      hint: 'Lista para presentar al banco',
      done: false,
      href: latestAnalysisId ? `/historial/${latestAnalysisId}` : '/analisis',
      icon: Download,
      cta: 'Descargar',
    },
  ]

  return (
    <ol className="mt-4 space-y-2">
      {steps.map((step, index) => {
        const Icon = step.icon
        return (
          <li
            key={step.label}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-3 py-2.5',
              step.done
                ? 'border-success-200 bg-success-50/60 dark:border-success-500/25 dark:bg-success-500/5'
                : 'border-border bg-secondary/30'
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                step.done
                  ? 'bg-success-500 text-white'
                  : 'bg-card text-muted-foreground'
              )}
              aria-hidden="true"
            >
              {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[12px] font-semibold', step.done ? 'text-success-700 dark:text-success-500' : 'text-foreground')}>
                {step.label}
              </span>
              <span className="block text-[10px] text-muted-foreground">{step.hint}</span>
            </span>
            {!step.done ? (
              <Link
                href={step.href}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {step.cta}
              </Link>
            ) : (
              <Circle className="h-3 w-3 text-success-500" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
