'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
  FileSpreadsheet,
  FileBadge,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  CreditCard,
  ShieldAlert,
  ScanLine,
  Building2,
  Clock3,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'

import { SecurityBadge } from '@/components/security-badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { submitAnalysis, NoCreditsError, AnalysisFailedError } from '@/application/submit-analysis'
import { buildAnalysisInsights } from '@/lib/analysis-insights'
import { trackEvent } from '@/lib/product-events'
import type { AnalysisRunResponse } from '@/domain'

type Step = 'upload' | 'analyzing' | 'done'

interface AnalysisResult extends AnalysisRunResponse {
  awaitingPayment?: boolean
  paymentAmount?: number
  syncError?: string
  message?: string
}

const ANALYSIS_STEPS = [
  { label: 'Leyendo el archivo', icon: FileText },
  { label: 'Extrayendo transacciones', icon: FileSpreadsheet },
  { label: 'Identificando comisiones de crédito', icon: ShieldCheck },
  { label: 'Detectando cobros duplicados', icon: AlertCircle },
  { label: 'Analizando cuotas y errores', icon: FileBadge },
  { label: 'Consultando IA para cargos desconocidos', icon: Sparkles },
  { label: 'Generando reporte final', icon: CheckCircle2 },
]

const BANKS = [
  'Santander',
  'BCI',
  'Banco de Chile',
  'BancoEstado',
  'Itaú',
  'Scotiabank',
  'Security',
  'Falabella',
  'Ripley',
]

export default function AnalisisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planFromUrl = searchParams?.get('plan') ?? null
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)
  const [fileError, setFileError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const isPlatino = planFromUrl === 'platino'
  const hasNoCredits = creditsLeft === 0 && !isPlatino

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('credits')
      .select('total, used')
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error && error.code !== 'PGRST116') {
          setCreditsLeft(null)
          return
        }
        setCreditsLeft(data ? Math.max(0, (data.total ?? 0) - (data.used ?? 0)) : 0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (step !== 'analyzing') return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleFile = useCallback(async (f: File) => {
    const allowed = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ]
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      setFileError('Ese archivo no es un PDF, Excel o CSV válido. Usa la cartola tal como la descarga tu banco.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError('Tu archivo pesa más de 10 MB. Descarga la cartola del mes, no del año.')
      return
    }

    const valid = await validateFileMagicBytes(f)
    if (!valid) {
      setFileError('El contenido del archivo no coincide con su extensión. Vuelve a descargar la cartola desde el banco.')
      return
    }

    setFileError('')
    setFile(f)
  }, [])

  async function validateFileMagicBytes(file: File): Promise<boolean> {
    const header = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(header)

    if (file.name.toLowerCase().endsWith('.pdf')) {
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    }

    if (file.name.toLowerCase().endsWith('.xlsx')) {
      return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    }
    if (file.name.toLowerCase().endsWith('.xls')) {
      return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
    }

    if (file.name.toLowerCase().endsWith('.csv')) {
      for (let i = 0; i < Math.min(bytes.length, 16); i++) {
        const b = bytes[i]
        if (b !== 0x0a && b !== 0x0d && b !== 0x09 && (b < 0x20 || b > 0x7e)) {
          return false
        }
      }
      return true
    }

    return true
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const runAnalysis = async () => {
    if (!file || loading) return

    if (hasNoCredits) {
      toast.error('No tienes créditos disponibles. Compra un plan para continuar.')
      router.push('/precios')
      return
    }

    cancelledRef.current = false
    setLoading(true)
    setStep('analyzing')
    setCurrentAnalysisStep(0)
    setElapsed(0)

    const controller = new AbortController()
    abortRef.current = controller
    void trackEvent('analysis_started', {
      file_type: file.type || 'desconocido',
      plan: isPlatino ? 'platino' : 'creditos',
    })

    const interval = setInterval(() => {
      setCurrentAnalysisStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 900)

    const timeout = setTimeout(() => controller.abort(), 120_000)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.')
        setStep('upload')
        router.push('/login')
        return
      }

      const analysisResult = await submitAnalysis({
        file,
        userId: user.id,
        isPlatino,
        signal: controller.signal,
      })

      if (cancelledRef.current) return

      setCurrentAnalysisStep(ANALYSIS_STEPS.length - 1)

      const awaitingPayment =
        Boolean(analysisResult.awaitingPayment) ||
        (isPlatino &&
          (analysisResult.recoverableAmount ?? 0) > 0 &&
          (analysisResult.anomaliesCount ?? 0) > 0)

      const resultData: AnalysisResult = {
        ...analysisResult,
        awaitingPayment,
        paymentAmount: awaitingPayment
          ? Math.round((analysisResult.recoverableAmount ?? 0) * 0.2)
          : undefined,
      }

      setResult(resultData)
      setStep('done')
      // Refrescar el layout del servidor para que el saldo de créditos y el
      // historial reflejen el análisis recién ejecutado.
      router.refresh()
      void trackEvent('analysis_completed', {
        analysis_id: analysisResult.analysisId,
        findings: analysisResult.anomaliesCount,
        recoverable: analysisResult.recoverableAmount,
        bank: analysisResult.bank,
        awaiting_payment: awaitingPayment,
      })
      toast.success(
        awaitingPayment
          ? 'Análisis listo. Revisa el reporte para desbloquearlo.'
          : 'Análisis completado exitosamente'
      )
    } catch (err: unknown) {
      if (cancelledRef.current) return

      if (err instanceof NoCreditsError) {
        void trackEvent('analysis_failed', { reason: 'no_credits' })
        toast.error('No tienes créditos disponibles. Compra un plan para continuar.')
        setStep('upload')
        router.push('/precios')
        return
      }

      if (err instanceof AnalysisFailedError) {
        const timedOut = /abort/i.test(err.message)
        void trackEvent('analysis_failed', {
          reason: timedOut ? 'timeout' : 'service_error',
          analysis_id: err.analysisId,
        })
        setResult({
          analysisId: err.analysisId,
          status: 'failed',
          totalTransactions: 0,
          anomaliesCount: 0,
          recoverableAmount: 0,
          summary: '',
          bank: '',
          syncError: timedOut
            ? 'El análisis está tardando más de lo esperado. Puedes revisar el historial en unos minutos; si no aparece, vuelve a intentarlo.'
            : err.message,
        })
        setStep('done')
        toast.error(timedOut ? 'El análisis está tardando más de lo esperado' : 'No pudimos completar el análisis')
        return
      }

      if (err instanceof Error && err.name === 'AbortError') {
        toast.error('El análisis tardó demasiado. Intenta nuevamente.')
        setStep('upload')
        return
      }

      void trackEvent('analysis_failed', { reason: 'unexpected' })
      toast.error(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setStep('upload')
    } finally {
      clearInterval(interval)
      clearTimeout(timeout)
      abortRef.current = null
      setLoading(false)
    }
  }

  const cancelAnalysis = useCallback(() => {
    cancelledRef.current = true
    abortRef.current?.abort()
    setStep('upload')
    setLoading(false)
    toast('Análisis cancelado')
  }, [])

  const resetForm = useCallback(() => {
    setStep('upload')
    setFile(null)
    setResult(null)
    setCurrentAnalysisStep(0)
    setElapsed(0)
    setLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  if (step === 'upload') {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow-accent">Nuevo análisis</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.9rem]">
                Auditar una cartola
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Sube tu estado de cuenta bancario. Revisamos comisiones, cuotas y cargos repetidos
            uno por uno, con evidencia para reclamar.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {isPlatino ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-medium text-warning-700 dark:border-warning-500/25 dark:bg-warning-500/10 dark:text-warning-500">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Plan Platino · pagas 20% solo si encontramos cobros
              </span>
            ) : creditsLeft !== null ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  hasNoCredits
                    ? 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/25 dark:bg-danger-500/10 dark:text-danger-500'
                    : 'border-border bg-secondary/60 text-foreground'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                {hasNoCredits
                  ? 'Sin créditos disponibles'
                  : `${creditsLeft} crédito${creditsLeft !== 1 ? 's' : ''} disponible${creditsLeft !== 1 ? 's' : ''}`}
              </span>
            ) : null}
          </div>
        </div>

        {hasNoCredits ? (
          <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/25 dark:bg-warning-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-500" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning-700 dark:text-warning-500">
                  Necesitas créditos para analizar
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-warning-700/80 dark:text-warning-500/80">
                  Cada análisis consume 1 crédito. Compra un plan o usa el Plan Platino.
                </p>
              </div>
              <Link
                href="/precios"
                className="shrink-0 rounded-lg bg-warning-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-warning-500"
              >
                Ver planes
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:p-12 ${
                file
                  ? 'border-success-500 bg-success-50/40 dark:bg-success-500/5'
                  : dragging
                    ? 'border-primary bg-accent/60'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/30'
              }`}
            >
              <input
                id="analysis-file"
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                aria-describedby="analysis-file-help"
              />

              {file ? (
                <div className="animate-fade-in-scale">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 shadow-inner dark:bg-success-500/10 dark:text-success-500">
                    <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">{file.name}</p>
                  <p className="num mt-1 text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    Quitar archivo
                  </button>
                </div>
              ) : (
                <label htmlFor="analysis-file" className="flex cursor-pointer flex-col items-center">
                  <div
                    className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                      dragging ? 'scale-110 bg-primary/10 text-primary' : 'bg-secondary/60 text-muted-foreground'
                    }`}
                  >
                    <Upload className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">
                    Arrastra tu cartola aquí
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">o haz clic para seleccionar un archivo</p>
                </label>
              )}
            </div>

            <p id="analysis-file-help" className="num mt-2 text-xs text-muted-foreground">
              {file ? 'Archivo listo para analizar · ' : ''}PDF, Excel (.xlsx) o CSV · Máximo 10 MB
            </p>

            {fileError ? (
              <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 dark:border-danger-500/25 dark:bg-danger-500/10">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600 dark:text-danger-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-danger-700 dark:text-danger-500">{fileError}</p>
                  <p className="mt-0.5 text-[11px] text-danger-700/80 dark:text-danger-500/80">
                    Si el problema sigue, escríbenos a soporte@cobrodetector.cl con el nombre del archivo.
                  </p>
                </div>
                <button type="button" onClick={() => setFileError('')} aria-label="Cerrar aviso" className="text-danger-600 hover:text-danger-700 dark:text-danger-500">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {file ? (
              hasNoCredits ? (
                <Link
                  href="/precios"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-warning-500 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-warning-600"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Comprar créditos para analizar
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  {isPlatino ? 'Analizar con Plan Platino' : 'Analizar ahora (usa 1 crédito)'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            ) : null}

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="eyebrow">Bancos compatibles</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {BANKS.map((bank) => (
                  <span
                    key={bank}
                    className="rounded-md border border-border/70 bg-secondary/40 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {bank}
                  </span>
                ))}
              </div>
              <a
                href="/cartola-ejemplo.csv"
                download
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Descargar cartola de ejemplo
              </a>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success-600 dark:text-success-500" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Privacidad primero</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tu archivo se cifra antes de salir del navegador y se elimina automáticamente
                al terminar el análisis. No guardamos el contenido original.{' '}
                <Link href="/seguridad" className="font-medium text-primary hover:underline">
                  Ver cómo cuidamos tus datos
                </Link>
              </p>
              <div className="mt-4">
                <SecurityBadge variant="detailed" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-5">
              <p className="eyebrow">Qué revisamos</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  'Comisiones de crédito repetidas',
                  'Cuotas sin interés mal calculadas',
                  'Cobros duplicados y cargos genéricos',
                  'Consistencia de montos y fechas',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/70 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              El análisis suele tardar menos de 1 minuto. Puedes salir y volver al historial.
            </div>
          </aside>
        </div>
      </div>
    )
  }

  if (step === 'analyzing') {
    const rawProgress = ((currentAnalysisStep + 1) / ANALYSIS_STEPS.length) * 100
    const progress = currentAnalysisStep >= ANALYSIS_STEPS.length - 1 ? 92 : Math.min(rawProgress, 90)
    const elapsedLabel =
      elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

    return (
      <div className="animate-fade-in mx-auto max-w-xl pt-8 sm:pt-14">
        <div className="text-center">
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <span className="absolute -inset-2 rounded-3xl border border-primary/15 animate-pulse-subtle" aria-hidden="true" />
          </div>
          <p className="eyebrow-accent">Auditoría en curso</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Estamos revisando tu cartola
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Normalmente toma menos de 1 minuto · {elapsedLabel}
          </p>
        </div>

        <Card className="mt-8 p-5 sm:p-6">
          <Progress
            value={progress}
            label="Progreso del análisis"
            hint={`${Math.round(progress)}% · paso ${currentAnalysisStep + 1} de ${ANALYSIS_STEPS.length}`}
          />

          <div className="mt-5 space-y-0.5" aria-live="polite">
            {ANALYSIS_STEPS.map((s, i) => {
              const isCompleted = i < currentAnalysisStep
              const isActive = i === currentAnalysisStep
              const StepIcon = s.icon

              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-300 ${
                    isCompleted
                      ? 'text-muted-foreground'
                      : isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground/60'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      isCompleted
                        ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500'
                        : isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-muted-foreground/60'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <StepIcon className={`h-3.5 w-3.5 ${isActive ? 'animate-pulse-subtle' : ''}`} aria-hidden="true" />
                    )}
                  </span>
                  <span>{s.label}</span>
                  {isActive ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                </div>
              )
            })}
          </div>

          <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            El porcentaje es estimado. El análisis se completa cuando el servicio confirma el resultado.
          </p>
        </Card>

        <button
          type="button"
          onClick={cancelAnalysis}
          className="mx-auto mt-5 flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Cancelar análisis
        </button>
      </div>
    )
  }

  if (!result) return null

  if (result.awaitingPayment) {
    const recoverable = result.recoverableAmount ?? 0
    const pct = Math.round(recoverable * 0.2)

    return (
      <div className="animate-fade-in mx-auto max-w-lg pt-6 sm:pt-12">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-warning-200 bg-warning-50 text-warning-600 dark:border-warning-500/25 dark:bg-warning-500/10 dark:text-warning-500">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-4">Plan Platino</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Reporte listo para desbloquear</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Detectamos <strong className="text-foreground">{result.anomaliesCount} hallazgo{result.anomaliesCount !== 1 ? 's' : ''}</strong> con{" "}
            <strong className="text-foreground">{formatCLP(recoverable)}</strong> recuperables.
          </p>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted-foreground">20% de lo recuperado</span>
            <span className="num-display text-3xl font-semibold text-warning-600 dark:text-warning-500">{formatCLP(pct)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Pagas solo si recuperas. El reporte completo se libera al acreditarse el pago.
          </p>
          <button
            onClick={() => router.push(`/historial/${result.analysisId}`)}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-warning-500 text-sm font-semibold text-white transition-colors hover:bg-warning-600"
          >
            Ir al reporte y pagar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </Card>

        <button
          onClick={resetForm}
          className="mx-auto mt-5 flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Nuevo análisis
        </button>
      </div>
    )
  }

  if (result.syncError) {
    return (
      <div className="animate-fade-in mx-auto max-w-lg pt-8 sm:pt-14">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger-200 bg-danger-50 text-danger-600 dark:border-danger-500/25 dark:bg-danger-500/10 dark:text-danger-500">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">No pudimos completar el análisis</h2>
        </div>

        <div className="mt-6 rounded-xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-500/25 dark:bg-danger-500/10">
          <p className="num whitespace-pre-wrap text-xs leading-relaxed text-danger-700 dark:text-danger-500">
            {result.syncError}
          </p>
        </div>
        <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
          El archivo se subió correctamente, pero el servicio no respondió. Puedes reintentar
          o revisar el historial.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={resetForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Intentar de nuevo
          </button>
          <button
            onClick={() => router.push(`/historial/${result.analysisId}`)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Ver en historial
          </button>
        </div>
      </div>
    )
  }

  const hasFindings = (result.anomaliesCount ?? 0) > 0
  const insights = buildAnalysisInsights({
    anomalies: result.anomalies,
    totalTransactions: result.totalTransactions,
    recoverableAmount: result.recoverableAmount,
    bank: result.bank,
    hasAiSummary: Boolean(result.summary),
  })
  const topFindings = insights.findings.slice(0, 3)

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow-accent">Análisis completado</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Resultado de tu cartola</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {result.totalTransactions} transacciones revisadas
          {result.bank ? ` · ${result.bank}` : ''}
        </p>
      </div>

      <section
        className={`relative overflow-hidden rounded-2xl border p-6 sm:p-7 ${
          hasFindings
            ? 'border-border bg-card'
            : 'border-success-200 bg-success-50/60 dark:border-success-500/25 dark:bg-success-500/5'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{hasFindings ? 'Monto recuperable' : 'Resultado'}</p>
            <p
              className={`num-display mt-2 text-[2.4rem] font-semibold leading-none tracking-tight sm:text-[2.8rem] ${
                hasFindings ? 'text-foreground' : 'text-success-700 dark:text-success-500'
              }`}
            >
              {hasFindings ? formatCLP(result.recoverableAmount ?? 0) : 'Sin cobros injustificados'}
            </p>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
              {hasFindings
                ? `Detectamos ${result.anomaliesCount} hallazgo${result.anomaliesCount !== 1 ? 's' : ''}. Revisa el detalle, la evidencia y el plan de reclamo.`
                : 'No encontramos cobros duplicados ni irregularidades en esta cartola.'}
            </p>
          </div>
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              hasFindings
                ? 'border-danger-200 bg-card text-danger-600 dark:border-danger-500/25 dark:text-danger-500'
                : 'border-success-200 bg-card text-success-600 dark:border-success-500/25 dark:text-success-500'
            }`}
          >
            {hasFindings ? <AlertCircle className="h-5 w-5" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-4">
          <div>
            <p className="eyebrow">Transacciones</p>
            <p className="num mt-1 text-lg font-semibold">{result.totalTransactions}</p>
          </div>
          <div>
            <p className="eyebrow">Hallazgos</p>
            <p className={`num mt-1 text-lg font-semibold ${hasFindings ? 'text-danger-600 dark:text-danger-500' : ''}`}>{result.anomaliesCount}</p>
          </div>
          <div>
            <p className="eyebrow">Estado</p>
            <p className="mt-1 text-sm font-semibold text-success-600 dark:text-success-500">Completado</p>
          </div>
        </div>
      </section>

      {result.summary ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="eyebrow">Resumen del análisis</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>
        </Card>
      ) : null}

      {topFindings.length > 0 ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Principales hallazgos</p>
            <span className="num text-[11px] text-muted-foreground">{insights.counts.total} en total</span>
          </div>
          <ul className="mt-3 divide-y divide-border/70">
            {topFindings.map((finding) => (
              <li key={`${finding.type}-${finding.title}`} className="flex items-start justify-between gap-4 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      finding.severity === 'high'
                        ? 'bg-danger-500'
                        : finding.severity === 'medium'
                          ? 'bg-warning-500'
                          : 'bg-muted-foreground'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{finding.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {finding.type === 'duplicate_commission'
                        ? 'Comisión duplicada'
                        : finding.type === 'duplicate_charge'
                          ? 'Cobro duplicado'
                          : finding.type === 'installment_error'
                            ? 'Error en cuotas'
                            : finding.type === 'incorrect_charge'
                              ? 'Cobro incorrecto'
                              : 'Cargo no reconocido'}
                      {typeof finding.confidence === 'number' ? ` · ${finding.confidence}% confianza` : ''}
                    </p>
                  </div>
                </div>
                <span className="num shrink-0 text-[13px] font-semibold text-foreground">{formatCLP(finding.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => router.push(`/historial/${result.analysisId}`)}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {hasFindings ? 'Ver reporte y evidencia' : 'Ver detalle del análisis'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={resetForm}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Nuevo análisis
        </button>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/70 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Guarda el reporte. Si el banco no responde en 10 días hábiles, puedes escalar el caso a la CMF.
      </div>
    </div>
  )
}
