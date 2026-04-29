'use client'

import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { formatCLP, formatDate, getAnomalyTypeLabel, getSeverityLabel } from '@/lib/utils'
import type { Analysis, DetectedAnomaly } from '@/types/database.types'

interface Props {
  analysis: Analysis
  anomalies: DetectedAnomaly[]
}

export default function DownloadReportButton({ analysis, anomalies }: Props) {
  const [loading, setLoading] = useState(false)

  const generateHTML = () => {
    const totalRecoverable = formatCLP(analysis.recoverable_amount)
    const date = formatDate(analysis.created_at)

    const anomalyRows = anomalies.map((a, i) => `
      <div class="anomaly ${a.severity}">
        <div class="anomaly-header">
          <div>
            <span class="badge">${getAnomalyTypeLabel(a.type)}</span>
            <span class="badge-severity">${getSeverityLabel(a.severity)}</span>
          </div>
          <strong class="amount">${formatCLP(a.recoverableAmount)}</strong>
        </div>
        <h3>${i + 1}. ${a.title}</h3>
        <p>${a.description}</p>
        ${a.detail ? `<p class="detail">${a.detail}</p>` : ''}
      </div>
    `).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte CobroDetector · ${analysis.file_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
  .logo { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 4px; }
  .title { font-size: 26px; font-weight: bold; color: #111; margin: 12px 0 4px; }
  .subtitle { font-size: 13px; color: #666; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
  .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .metric-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
  .metric-value { font-size: 24px; font-weight: bold; color: #111; }
  .metric-value.danger { color: #dc2626; }
  .metric-value.success { color: #16a34a; }
  .section-title { font-size: 16px; font-weight: bold; color: #111; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .anomaly { border-left: 4px solid #e2e8f0; background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .anomaly.high { border-left-color: #dc2626; background: #fef2f2; }
  .anomaly.medium { border-left-color: #d97706; background: #fffbeb; }
  .anomaly.low { border-left-color: #2563eb; background: #eff6ff; }
  .anomaly-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .badge { font-size: 11px; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 99px; margin-right: 6px; }
  .badge-severity { font-size: 11px; color: #64748b; }
  .amount { font-size: 18px; color: #dc2626; }
  .anomaly h3 { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
  .anomaly p { font-size: 13px; color: #374151; margin-bottom: 4px; }
  .anomaly .detail { font-size: 11px; color: #6b7280; font-family: monospace; background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 4px; }
  .summary-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .summary-box p { font-size: 13px; color: #1d4ed8; line-height: 1.6; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #9ca3af; }
  .total-banner { background: #dc2626; color: white; border-radius: 8px; padding: 16px 20px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
  .total-banner .label { font-size: 13px; opacity: 0.9; }
  .total-banner .value { font-size: 28px; font-weight: bold; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">🛡️ CobroDetector</div>
  <h1 class="title">Reporte de Cobros Injustificados</h1>
  <p class="subtitle">
    Archivo: <strong>${analysis.file_name}</strong> &nbsp;·&nbsp;
    Banco: <strong>${analysis.bank ?? 'No detectado'}</strong> &nbsp;·&nbsp;
    Fecha de análisis: <strong>${date}</strong>
  </p>
</div>

<div class="metrics">
  <div class="metric">
    <div class="metric-label">Transacciones analizadas</div>
    <div class="metric-value">${analysis.total_transactions}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Anomalías detectadas</div>
    <div class="metric-value danger">${analysis.anomalies_count}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Estado del análisis</div>
    <div class="metric-value" style="font-size:16px">Completado ✓</div>
  </div>
</div>

${analysis.ai_summary ? `
<div class="summary-box">
  <strong style="font-size:12px;color:#1e40af;display:block;margin-bottom:6px">RESUMEN EJECUTIVO (Análisis IA)</strong>
  <p>${analysis.ai_summary}</p>
</div>` : ''}

<div class="total-banner">
  <div>
    <div class="label">MONTO TOTAL RECUPERABLE ESTIMADO</div>
    <div style="font-size:11px;opacity:0.8">Suma de todos los cobros injustificados detectados</div>
  </div>
  <div class="value">${totalRecoverable}</div>
</div>

<div class="section-title">Detalle de Cobros Injustificados Detectados</div>
${anomalyRows}

<div class="section-title">Instrucciones para Reclamar</div>
<ol style="font-size:13px;color:#374151;line-height:2;padding-left:20px">
  <li>Imprime o guarda este reporte en PDF.</li>
  <li>Dirígete a una sucursal del banco o contacta a tu ejecutivo de cuenta.</li>
  <li>Presenta el reporte y solicita el reverso de los cobros injustificados.</li>
  <li>El banco tiene <strong>10 días hábiles</strong> para responder según la Ley del Consumidor.</li>
  <li>Si no hay respuesta, presenta un reclamo en <strong>cmfchile.cl</strong> o llama al <strong>800 700 100</strong>.</li>
</ol>

<div class="footer">
  <p>Este reporte fue generado automáticamente por CobroDetector · cobro-detector.cl</p>
  <p>La detección de anomalías se basa en reglas de negocio bancario chileno y análisis por inteligencia artificial.</p>
  <p>Reporte generado el ${new Date().toLocaleDateString('es-CL')} · ID de análisis: ${analysis.id}</p>
</div>
</body>
</html>`
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const html = generateHTML()
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-cobros-${analysis.id.slice(0, 8)}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Descargar reporte
    </button>
  )
}
