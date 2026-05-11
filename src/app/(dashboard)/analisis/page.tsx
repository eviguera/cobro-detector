'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight, X, FileSpreadsheet, FileBadge, ShieldCheck, Sparkles, Clock, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/utils'

type Step = 'upload' | 'analyzing' | 'done'

interface AnomalyResult {
  type: string
  severity: string
  title: string
  description: string
  detail: string
  recoverableAmount: number
}

interface AnalysisResult {
  analysisId: string
  totalTransactions?: number
  anomaliesCount?: number
  recoverableAmount?: number
  anomalies?: AnomalyResult[]
  summary?: string
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

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400',
  low: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400',
}

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Alta prioridad',
  medium: 'Media',
  low: 'Baja',
}

const TYPE_LABELS: Record<string, string> = {
  duplicate_commission: 'Comisión duplicada',
  installment_error: 'Error en cuotas',
  unknown_charge: 'Cargo no reconocido',
  incorrect_charge: 'Cobro incorrecto',
}

export default function AnalisisPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
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
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const runAnalysis = async () => {
    if (!file) return
    setLoading(true)
    setStep('analyzing')
    setCurrentAnalysisStep(0)

    const interval = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 900)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      clearInterval(interval)
      setCurrentAnalysisStep(ANALYSIS_STEPS.length - 1)

      if (!res.ok) {
        if (res.status === 402) {
          toast.error('No tienes créditos disponibles. Compra un plan para continuar.')
          router.push('/precios')
          return
        }
        throw new Error(data.error ?? 'Error en el análisis')
      }

      await new Promise(r => setTimeout(r, 600))
      setResult(data)
      setStep('done')
      setLoading(false)
      toast.success('Análisis completado exitosamente')
    } catch (err: unknown) {
      clearInterval(interval)
      setLoading(false)
      toast.error(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setStep('upload')
    }
  }

  const resetForm = useCallback(() => {
    setStep('upload')
    setFile(null)
    setResult(null)
    setCurrentAnalysisStep(0)
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
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Analizar estado de cuenta
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Sube tu estado de cuenta bancario y detectamos cobros injustificados en minutos.
          </p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 ${
            file
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
              : dragging
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            aria-label="Seleccionar archivo de estado de cuenta"
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
                onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
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
              <p className="text-xs text-gray-300 dark:text-gray-600 font-mono">
                PDF, Excel (.xlsx) o CSV · Máximo 10MB
              </p>
            </div>
          )}
        </div>

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
            Analizar ahora (usa 1 crédito)
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  if (step === 'analyzing') {
    const progress = ((currentAnalysisStep + 1) / ANALYSIS_STEPS.length) * 100

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
          Esto puede tomar hasta 1 minuto
        </p>

        <div className="mb-8">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400 font-mono">{Math.round(progress)}%</span>
            <span className="text-xs text-gray-400">{currentAnalysisStep + 1} de {ANALYSIS_STEPS.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm space-y-0.5">
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
                  'text-gray-300 dark:text-gray-600'
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
      </div>
    )
  }

  if (!result) return null

  const anomalies = result.anomalies ?? []
  const highCount = anomalies.filter(a => a.severity === 'high').length
  const totalRecoverable = result.recoverableAmount ?? anomalies.reduce((sum, a) => sum + (a.recoverableAmount ?? 0), 0)
  const isAsync = !result.anomalies && !result.totalTransactions

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

      {isAsync ? (
        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-8 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Clock className="w-7 h-7 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Análisis en proceso
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
            Tu estado de cuenta está siendo procesado. Los resultados estarán disponibles en el historial en unos momentos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/historial/${result.analysisId}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Ver en historial
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Nuevo análisis
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
            <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Anomalías detectadas
              </p>
              <p className="text-3xl font-display font-bold text-red-600 dark:text-red-400">
                <span className="tabular-nums">{anomalies.length}</span>
              </p>
              {highCount > 0 && (
                <p className="text-xs text-red-400 dark:text-red-500 mt-1.5">
                  {highCount} de alta prioridad
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Monto recuperable
              </p>
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
                <span className="tabular-nums">{formatCLP(totalRecoverable)}</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">estimado</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                Siguiente paso
              </p>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Descarga el reporte y ve al banco
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

          {anomalies.length > 0 && (
            <div className="space-y-3">
              {anomalies.map((anomaly, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${SEVERITY_COLORS[anomaly.severity] ?? 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800/40'}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800/60">
                        {TYPE_LABELS[anomaly.type] ?? anomaly.type}
                      </span>
                      <span className="text-xs opacity-70">{SEVERITY_LABELS[anomaly.severity]}</span>
                    </div>
                    <span className="font-display font-bold text-lg tabular-nums">
                      {formatCLP(anomaly.recoverableAmount)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{anomaly.title}</p>
                  <p className="text-xs opacity-80 leading-relaxed">{anomaly.description}</p>
                  {anomaly.detail && (
                    <p className="text-xs opacity-60 mt-2 font-mono">{anomaly.detail}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(`/historial/${result.analysisId}`)}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Ver reporte completo
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
        </>
      )}
    </div>
  )
}
