'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight, X } from 'lucide-react'
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
  'Leyendo el archivo...',
  'Extrayendo transacciones...',
  'Identificando comisiones de crédito...',
  'Detectando cobros duplicados...',
  'Analizando cuotas y errores...',
  'Consultando IA para cargos desconocidos...',
  'Generando reporte...',
]

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
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

    // Simular pasos progresivos
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
      <div className="animate-fade-in max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nuevo análisis</h1>
        <p className="text-sm text-gray-500 mb-8">Sube tu estado de cuenta bancario y detectamos cobros injustificados en minutos.</p>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' :
            file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}
        >
          {file ? (
            <div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-medium text-gray-900 mb-1">{file.name}</p>
              <p className="text-sm text-gray-500 mb-4">{(file.size / 1024).toFixed(0)} KB</p>
              <button onClick={() => setFile(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
                <X className="w-3 h-3" /> Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 mb-2">Arrastra tu estado de cuenta aquí</p>
              <p className="text-sm text-gray-400 mb-6">PDF, Excel (.xlsx) o CSV · Máximo 10MB</p>
              <label className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                Seleccionar archivo
                <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>

        {/* Bancos compatibles */}
        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-3">Bancos compatibles</p>
          <div className="flex flex-wrap gap-2">
            {['Santander', 'BCI', 'Banco de Chile', 'BancoEstado', 'Itaú', 'Scotiabank', 'Security', 'Falabella', 'Ripley'].map(bank => (
              <span key={bank} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">{bank}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Tu archivo se procesa de forma segura y no se almacena el contenido original, solo los datos del análisis.</span>
        </div>

        {file && (
          <button
            onClick={runAnalysis}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Analizar ahora (usa 1 crédito)
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  if (step === 'analyzing') {
    return (
      <div className="animate-fade-in max-w-xl mx-auto pt-20 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analizando tu estado de cuenta</h2>
        <p className="text-gray-400 text-sm mb-8">Esto puede tomar hasta 1 minuto</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-3">
          {ANALYSIS_STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 text-sm transition-all ${
              i < currentAnalysisStep ? 'text-green-600' :
              i === currentAnalysisStep ? 'text-blue-600 font-medium' :
              'text-gray-300'
            }`}>
              {i < currentAnalysisStep ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : i === currentAnalysisStep ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-current flex-shrink-0" />
              )}
              {s}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Done
  if (!result) return null
  const highCount = result.anomalies.filter(a => a.severity === 'high').length

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Análisis completado</h1>
          <p className="text-sm text-gray-500">{result.totalTransactions} transacciones analizadas</p>
        </div>
        <button onClick={() => router.push(`/historial/${result.analysisId}`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          <FileText className="w-4 h-4" />
          Ver reporte completo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Anomalías detectadas</p>
          <p className="text-3xl font-bold text-red-600">{result.anomaliesCount}</p>
          {highCount > 0 && <p className="text-xs text-red-400 mt-1">{highCount} de alta prioridad</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Monto recuperable</p>
          <p className="text-2xl font-bold text-gray-900">{formatCLP(result.recoverableAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">estimado</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-xs text-green-600 mb-1">Siguiente paso</p>
          <p className="text-sm font-semibold text-green-900">Descarga el reporte y ve al banco</p>
        </div>
      </div>

      {result.summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-blue-600 mb-1">Resumen del análisis (IA)</p>
          <p className="text-sm text-blue-900">{result.summary}</p>
        </div>
      )}

      {/* Anomalies list */}
      <div className="space-y-3">
        {result.anomalies.map((anomaly, i) => (
          <div key={i} className={`border rounded-xl p-5 ${SEVERITY_COLORS[anomaly.severity]}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                  {TYPE_LABELS[anomaly.type] ?? anomaly.type}
                </span>
                <span className="text-xs">{SEVERITY_LABELS[anomaly.severity]}</span>
              </div>
              <span className="font-bold text-lg">{formatCLP(anomaly.recoverableAmount)}</span>
            </div>
            <p className="font-semibold text-sm mb-1">{anomaly.title}</p>
            <p className="text-xs opacity-80">{anomaly.description}</p>
            {anomaly.detail && <p className="text-xs opacity-60 mt-1">{anomaly.detail}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => router.push(`/historial/${result.analysisId}`)}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Descargar reporte PDF
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setStep('upload'); setFile(null); setResult(null) }}
          className="px-6 py-3 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Nuevo análisis
        </button>
      </div>
    </div>
  )
}
