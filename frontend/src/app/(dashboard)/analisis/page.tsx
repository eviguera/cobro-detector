'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight, X, FileSpreadsheet, FileBadge, ShieldCheck, Sparkles, RotateCcw, CreditCard, ShieldAlert, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'

import { SecurityBadge } from '@/components/security-badge'
import { createClient } from '@/lib/supabase/client'
import { submitAnalysis, NoCreditsError, AnalysisFailedError } from '@/application/submit-analysis'
import type { AnalysisRunResponse } from '@/domain'

type Step = 'upload' | 'analyzing' | 'done'

interface AnomalyResult {
  type: string
  severity: string
  title: string
  description: string
  detail: string
  recoverableAmount: number
}

interface AnalysisResult extends AnalysisRunResponse {
  anomalies?: AnomalyResult[]
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
  const [elapsed, setElapsed] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const isPlatino = planFromUrl === 'platino'
  const hasNoCredits = creditsLeft === 0 && !isPlatino

  // Saldo real para avisar ANTES de subir, no después de gastar el intento.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('credits')
      .select('total, used')
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        // Si falla la lectura, no asumimos "sin créditos": bloquearíamos a un
        // usuario que sí tiene saldo. Dejamos el aviso en manos del backend.
        if (error && error.code !== 'PGRST116') {
          setCreditsLeft(null)
          return
        }
        setCreditsLeft(data ? Math.max(0, (data.total ?? 0) - (data.used ?? 0)) : 0)
      })
    return () => { cancelled = true }
  }, [])

  // Cronómetro visible durante el análisis: da feedback de que sigue vivo.
  useEffect(() => {
    if (step !== 'analyzing') return
    setElapsed(0)
    const timer = setInterval(() => setElapsed(seconds => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleFile = useCallback(async (f: File) => {
    const allowed = ['application/pdf', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv']
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      toast.error('Formato no soportado. Usa PDF, Excel o CSV.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB.')
      return
    }

    // Validar magic bytes (firma del archivo) para evitar archivos renombrados
    // o con contenido malicioso disfrazado de CSV/Excel/PDF.
    const valid = await validateFileMagicBytes(f)
    if (!valid) {
      toast.error('El archivo no parece ser un PDF, Excel o CSV válido.')
      return
    }

    setFile(f)
  }, [])

  /**
   * Valida los "magic bytes" (primeros bytes del archivo) para confirmar
   * que el archivo es realmente del tipo que dice ser, y no un archivo
   * renombrado con contenido potencialmente malicioso.
   */
  async function validateFileMagicBytes(file: File): Promise<boolean> {
    const header = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(header)

    // PDF: %PDF (0x25 0x50 0x44 0x46)
    if (file.name.toLowerCase().endsWith('.pdf')) {
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    }

    // Excel moderno (.xlsx): PK\x03\x04 (ZIP-based)
    // Excel antiguo (.xls): 0xD0 0xCF 0x11 0xE0 (OLE2)
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    }
    if (file.name.toLowerCase().endsWith('.xls')) {
      return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
    }

    // CSV: no tiene magic bytes fijos, pero debe ser texto legible
    if (file.name.toLowerCase().endsWith('.csv')) {
      // Verificar que los primeros bytes sean caracteres imprimibles (ASCII)
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

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

    const interval = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 900)

    // Si el servicio no responde, cortar a los 2 minutos en vez de dejar
    // al usuario atrapado en una pantalla de progreso infinita.
    const timeout = setTimeout(() => controller.abort(), 120_000)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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

      // Platino solo paga cuando hay algo que recuperar. Sin anomalías no
      // corresponde mostrar un paywall de $0.
      const awaitingPayment = Boolean(analysisResult.awaitingPayment) ||
        (isPlatino && (analysisResult.recoverableAmount ?? 0) > 0 && (analysisResult.anomaliesCount ?? 0) > 0)

      const resultData: AnalysisResult = {
        ...analysisResult,
        anomalies: [],
        awaitingPayment,
        paymentAmount: awaitingPayment ? Math.round((analysisResult.recoverableAmount ?? 0) * 0.2) : undefined,
      }

      setResult(resultData)
      setStep('done')
      toast.success(
        awaitingPayment
          ? 'Análisis listo. Revisa el reporte para desbloquearlo.'
          : 'Análisis completado exitosamente',
      )
    } catch (err: unknown) {
      if (cancelledRef.current) return

      if (err instanceof NoCreditsError) {
        toast.error('No tienes créditos disponibles. Compra un plan para continuar.')
        setStep('upload')
        router.push('/precios')
        return
      }

      if (err instanceof AnalysisFailedError) {
        const timedOut = /abort/i.test(err.message)
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
      <div className="animate-fade-in-up max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
              Nuevo análisis
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Analizar estado de cuenta
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
              <Lock className="w-3 h-3" />
              Conexión cifrada (HTTPS)
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Sube tu estado de cuenta bancario y detectamos cobros injustificados en minutos.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isPlatino ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                Plan Platino · pagas solo el 20% si encontramos cobros
              </span>
            ) : creditsLeft !== null ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                hasNoCredits
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                <CreditCard className="w-3.5 h-3.5" />
                {hasNoCredits
                  ? 'Sin créditos disponibles'
                  : `${creditsLeft} crédito${creditsLeft !== 1 ? 's' : ''} disponible${creditsLeft !== 1 ? 's' : ''}`}
              </span>
            ) : null}
          </div>
        </div>

        {hasNoCredits && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Necesitas créditos para analizar
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  Cada análisis consume 1 crédito. Compra un plan para continuar o usa el Plan Platino.
                </p>
              </div>
              <Link
                href="/precios"
                className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Ver planes
              </Link>
            </div>
          </div>
        )}

        {/* Mensaje de privacidad antes de subir */}
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Privacidad de tus datos
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                Tu CSV se procesa y se elimina automáticamente, no lo guardamos. Toda la conexión es cifrada con SSL/TLS.
              </p>
            </div>
          </div>
        </div>

        {/* Sellos de seguridad cerca del área de drop */}
        <SecurityBadge variant="grid" className="mb-6" />

        <label
          htmlFor="analysis-file"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/30 sm:p-12 ${
            file
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
              : dragging
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
          }`}
        >
          <input
            id="analysis-file"
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            aria-describedby="analysis-file-help"
          />

          {file ? (
            <div className="animate-fade-in-scale">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-display font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {file.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">
                {(file.size / 1024).toFixed(0)} KB
              </p>
              <button
                type="button"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
                Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                dragging
                  ? 'bg-blue-100 dark:bg-blue-900/50 scale-110'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                <Upload className={`w-7 h-7 transition-colors duration-300 ${
                  dragging ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`} />
              </div>
              <p className="font-display font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                Arrastra tu estado de cuenta aquí
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                o haz clic para seleccionar un archivo
              </p>
              <p id="analysis-file-help" className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                PDF, Excel (.xlsx) o CSV · Máximo 10MB
              </p>
            </div>
          )}
        </label>

        <div className="mt-6 bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-800/40 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wider">
            Bancos compatibles
          </p>
          <div className="flex flex-wrap gap-2">
            {['Santander', 'BCI', 'Banco de Chile', 'BancoEstado', 'Itaú', 'Scotiabank', 'Security', 'Falabella', 'Ripley'].map(bank => (
              <span key={bank} className="text-[11px] px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 font-medium">
                {bank}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 text-xs text-gray-400 dark:text-gray-500">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
          <span>
            Tu archivo se procesa de forma segura. No almacenamos el contenido original, solo los datos del análisis.
          </span>
        </div>

        {file && (
          hasNoCredits ? (
            <Link
              href="/precios"
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-600"
            >
              <CreditCard className="w-4 h-4" />
              Comprar créditos para analizar
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isPlatino ? 'Analizar con Plan Platino' : 'Analizar ahora (usa 1 crédito)'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    )
  }

  if (step === 'analyzing') {
    const rawProgress = ((currentAnalysisStep + 1) / ANALYSIS_STEPS.length) * 100
    // Nunca mostrar 100% mientras el servicio sigue trabajando.
    const progress = currentAnalysisStep >= ANALYSIS_STEPS.length - 1 ? 92 : Math.min(rawProgress, 90)
    const elapsedLabel = elapsed < 60
      ? `${elapsed}s`
      : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

    return (
      <div className="animate-fade-in-up max-w-lg mx-auto pt-16 sm:pt-24">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <div className="absolute -inset-3 border-2 border-blue-200 dark:border-blue-800 rounded-3xl animate-pulse-subtle" />
        </div>

        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-50 text-center mb-2">
          Analizando tu estado de cuenta
        </h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center mb-10">
          Normalmente toma menos de 1 minuto · {elapsedLabel}
        </p>

        <div className="mb-8" role="status" aria-live="polite" aria-label="Progreso del análisis">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso del análisis: ${Math.round(progress)} por ciento completado`}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400 font-mono">{Math.round(progress)}%</span>
            <span className="text-xs text-gray-400">{currentAnalysisStep + 1} de {ANALYSIS_STEPS.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm space-y-0.5" aria-live="polite" aria-label="Paso actual del análisis">
          {ANALYSIS_STEPS.map((s, i) => {
            const isCompleted = i < currentAnalysisStep
            const isActive = i === currentAnalysisStep
            const StepIcon = s.icon

            return (
              <div
                key={s.label}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-all duration-300 ${
                  isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                  isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 font-medium' :
                  'text-gray-400 dark:text-gray-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  isActive ? 'bg-blue-100 dark:bg-blue-900/50' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <StepIcon className="w-3.5 h-3.5 animate-pulse-subtle" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5 opacity-40" />
                  )}
                </div>
                <span className="font-medium">{s.label}</span>
                {isActive && (
                  <Loader2 className="w-3.5 h-3.5 ml-auto animate-spin" />
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={cancelAnalysis}
          className="mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-3.5 h-3.5" />
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
      <div className="animate-fade-in-up max-w-lg mx-auto pt-8 sm:pt-16">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-gray-50 text-center mb-2">
          Reporte bloqueado — Plan Platino
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 leading-relaxed">
          Detectamos <strong>{result.anomaliesCount} anomalía{result.anomaliesCount !== 1 ? 's' : ''}</strong> con un monto recuperable de <strong>{formatCLP(result.recoverableAmount ?? 0)}</strong>.
        </p>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">20% de lo recuperado</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCLP(pct)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            Pagá solo cuando recuperes. El reporte completo se libera al acreditar el pago.
          </p>
          <button
            onClick={() => router.push(`/historial/${result.analysisId}`)}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
          >
            Ir al reporte y pagar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={resetForm} className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Nuevo análisis
        </button>
      </div>
    )
  }

  const syncError = result.syncError

  if (syncError) {
    return (
      <div className="animate-fade-in-up max-w-lg mx-auto pt-16 sm:pt-24">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-gray-50 text-center mb-2">
          No pudimos completar el análisis
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
            {syncError}
          </p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          El archivo se subió correctamente, pero el servicio de análisis no respondió.
          Puedes reintentar con el mismo archivo o revisar el historial.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Intentar de nuevo
          </button>
          <button
            onClick={() => router.push(`/historial/${result.analysisId}`)}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-all"
          >
            Ver en historial
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              Análisis completado
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Resultados del análisis
          </h1>
          {result.totalTransactions && (
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-mono">
              {result.totalTransactions} transacciones analizadas
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Anomalías detectadas
          </p>
          <p className={`text-3xl font-display font-bold ${
            (result.anomaliesCount ?? 0) > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            <span className="tabular-nums">{result.anomaliesCount}</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Monto recuperable
          </p>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
            <span className="tabular-nums">{formatCLP(result.recoverableAmount ?? 0)}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">estimado</p>
        </div>
        <div className={`rounded-2xl p-5 ${
          (result.anomaliesCount ?? 0) > 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40'
        }`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1.5 ${
            (result.anomaliesCount ?? 0) > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}>
            Siguiente paso
          </p>
          <p className={`text-sm font-semibold ${
            (result.anomaliesCount ?? 0) > 0
              ? 'text-emerald-900 dark:text-emerald-100'
              : 'text-blue-900 dark:text-blue-100'
          }`}>
            {(result.anomaliesCount ?? 0) > 0
              ? 'Descarga el reporte y ve al banco'
              : 'No encontramos cobros injustificados'}
          </p>
        </div>
      </div>

      {result.summary && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Resumen del análisis (IA)
            </p>
          </div>
          <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
            {result.summary}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push(`/historial/${result.analysisId}`)}
          className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {(result.anomaliesCount ?? 0) > 0 ? 'Ver reporte completo' : 'Ver detalle del análisis'}
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={resetForm}
          className="px-6 py-3.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Nuevo análisis
        </button>
      </div>
    </div>
  )
}
