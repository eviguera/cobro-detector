'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight, X, FileSpreadsheet, FileBadge, ShieldCheck, Sparkles, Clock } from 'lucide-react'
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
  totalTransactions: number
  anomaliesCount: number
  recoverableAmount: number
  anomalies: AnomalyResult[]
  summary: string
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
  high: 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/20 text-danger-700 dark:text-danger-400',
  medium: 'bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20 text-warning-700 dark:text-warning-400',
  low: 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-400',
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
}

export default function AnalisisPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)

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
    setStep('analyzing')
    setCurrentAnalysisStep(0)

    const interval = setInterval(() => {
      setCurrentAnalysisStep(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(interval); return prev }
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
    } catch (err: unknown) {
      clearInterval(interval)
      toast.error(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setStep('upload')
    }
  }

  if (step === 'upload') {
    return (
      <div className="animate-fade-in-up max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 font-mono">
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

        {/* Upload Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`upload-zone card-fintech rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
            dragging ? 'dragging scale-[1.02]' : ''
          }`}
          role="button"
          tabIndex={0}
          aria-label="Zona de carga de archivos. Arrastra un archivo aquí o haz clic para seleccionar."
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }}
        >
          {file ? (
            <div className="animate-fade-in-scale">
              <div className="w-16 h-16 bg-success-50 dark:bg-success-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <p className="font-display font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {file.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">
                {(file.size / 1024).toFixed(0)} KB
              </p>
              <button
                onClick={() => setFile(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
                Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                dragging
                  ? 'bg-brand-100 dark:bg-brand-900/50 scale-110'
                  : 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400'
              }`}>
                <Upload className={`w-7 h-7 transition-colors duration-300 ${
                  dragging ? 'text-brand-600 dark:text-brand-400' : 'text-brand-500'
                }`} />
              </div>
              <p className="font-display font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                Arrastra tu estado de cuenta aquí
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                o haz clic para seleccionar un archivo
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                Seleccionar archivo
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  aria-label="Seleccionar archivo de estado de cuenta"
                />
              </label>
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 font-mono">
                PDF, Excel (.xlsx) o CSV · Máximo 10MB
              </p>
            </div>
          )}
        </div>

        {/* Banks */}
        <div className="mt-6 card-fintech rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Bancos compatibles
          </p>
          <div className="flex flex-wrap gap-2">
            {['Santander', 'BCI', 'Banco de Chile', 'BancoEstado', 'Itaú', 'Scotiabank', 'Security', 'Falabella', 'Ripley'].map(bank => (
              <span key={bank} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 font-medium">
                {bank}
              </span>
            ))}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 flex items-start gap-2.5 text-xs text-gray-400 dark:text-gray-500">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-success-500" />
          <span>
            Tu archivo se procesa de forma segura. No almacenamos el contenido original, solo los datos del análisis.
          </span>
        </div>

        {/* Submit Button */}
        {file && (
          <button
            onClick={runAnalysis}
            className="mt-6 w-full flex items-center justify-center gap-2.5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-all duration-300 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5"
          >
            Analizar ahora (usa 1 crédito)
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    )
  }

  if (step === 'analyzing') {
    const progress = ((currentAnalysisStep + 1) / ANALYSIS_STEPS.length) * 100

    return (
      <div className="animate-fade-in-up max-w-lg mx-auto pt-16 sm:pt-24">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-brand-600 dark:text-brand-400 animate-spin" />
          </div>
          <div className="absolute -inset-3 border-2 border-brand-200 dark:border-brand-800 rounded-3xl animate-pulse-subtle" />
        </div>

        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-50 text-center mb-2">
          Analizando tu estado de cuenta
        </h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center mb-10">
          Esto puede tomar hasta 1 minuto
        </p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400 font-mono">{Math.round(progress)}%</span>
            <span className="text-xs text-gray-400">{currentAnalysisStep + 1} de {ANALYSIS_STEPS.length}</span>
          </div>
        </div>

        {/* Steps */}
        <div className="card-fintech rounded-2xl p-6 space-y-1">
          {ANALYSIS_STEPS.map((s, i) => {
            const isCompleted = i < currentAnalysisStep
            const isActive = i === currentAnalysisStep
            const StepIcon = s.icon

            return (
              <div
                key={s.label}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-all duration-300 ${
                  isCompleted ? 'text-success-600 dark:text-success-400' :
                  isActive ? 'text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/50 font-medium' :
                  'text-gray-300 dark:text-gray-600'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCompleted ? 'bg-success-50 dark:bg-success-500/10' :
                  isActive ? 'bg-brand-100 dark:bg-brand-900/50' :
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

  // Done
  if (!result) return null
  const highCount = result.anomalies.filter(a => a.severity === 'high').length

  return (
    <div className="animate-fade-in-up max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-success-600 dark:text-success-400 font-mono">
              Análisis completado
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Resultados del análisis
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-mono">
            {result.totalTransactions} transacciones analizadas
          </p>
        </div>
        <button
          onClick={() => router.push(`/historial/${result.analysisId}`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:-translate-y-0.5"
        >
          <FileText className="w-4 h-4" />
          Ver reporte completo
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
        <div className="card-fintech rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Anomalías detectadas
          </p>
          <p className="text-3xl font-display font-bold text-danger-600 dark:text-danger-400">
            <span className="tabular-nums">{result.anomaliesCount}</span>
          </p>
          {highCount > 0 && (
            <p className="text-xs text-danger-400 dark:text-danger-500 mt-1.5">
              {highCount} de alta prioridad
            </p>
          )}
        </div>
        <div className="card-fintech rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Monto recuperable
          </p>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-50">
            <span className="tabular-nums">{formatCLP(result.recoverableAmount)}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">estimado</p>
        </div>
        <div className="bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/20 rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <p className="text-xs font-medium text-success-600 dark:text-success-400 uppercase tracking-wider mb-1.5">
            Siguiente paso
          </p>
          <p className="text-sm font-semibold text-success-900 dark:text-success-100">
            Descarga el reporte y ve al banco
          </p>
        </div>
      </div>

      {/* AI Summary */}
      {result.summary && (
        <div className="bg-brand-50 dark:bg-brand-950/50 border border-brand-100 dark:border-brand-800/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Resumen del análisis (IA)
            </p>
          </div>
          <p className="text-sm text-brand-900 dark:text-brand-100 leading-relaxed">
            {result.summary}
          </p>
        </div>
      )}

      {/* Anomalies List */}
      <div className="space-y-3">
        {result.anomalies.map((anomaly, i) => (
          <div
            key={i}
            className={`border rounded-2xl p-5 transition-all duration-300 hover:shadow-md ${SEVERITY_COLORS[anomaly.severity]}`}
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

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push(`/historial/${result.analysisId}`)}
          className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-all duration-300 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          Descargar reporte PDF
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setStep('upload'); setFile(null); setResult(null) }}
          className="px-6 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 hover:-translate-y-0.5"
        >
          Nuevo análisis
        </button>
      </div>
    </div>
  )
}
