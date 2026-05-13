'use client'

import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { formatCLP, formatDate, getAnomalyTypeLabel, getSeverityLabel } from '@/lib/utils'
import { SEVERITY } from '@/lib/constants'
import type { Analysis, DetectedAnomaly, ParsedTransaction } from '@/types/database.types'

interface Props {
  analysis: Analysis
  anomalies: DetectedAnomaly[]
  transactions: ParsedTransaction[]
}

function buildTransactionTable(anomaly: DetectedAnomaly, txMap: Map<string, ParsedTransaction>): string {
  const txs = anomaly.transactionRefs
    .map(id => txMap.get(id))
    .filter((t): t is ParsedTransaction => !!t)

  if (txs.length === 0) {
    return `<p style="font-size:11px;color:#6b7280;margin-top:8px;">(No se encontraron las transacciones en los datos originales. Usá los IDs de referencia para identificarlas en tu estado de cuenta.)</p>`
  }

  const isSingleCharge = anomaly.type === 'unknown_charge' || (anomaly.type === 'incorrect_charge' && txs.length === 1)

  const rows = txs.map((tx, idx) => {
    let badge = ''
    if (isSingleCharge) {
      badge = '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;">A REVERSAR</span>'
    } else if (idx === 0 && anomaly.type === 'duplicate_commission') {
      badge = '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;">Original</span>'
    } else {
      badge = '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;">A REVERSAR</span>'
    }

    const dangerRow = badge.includes('REVERSAR') ? 'background:#fff5f5;' : ''

    return `<tr style="${dangerRow}">
      <td style="font-family:monospace;font-size:11px;">${tx.id}</td>
      <td>${tx.date}</td>
      <td style="max-width:200px;word-break:break-word;">${tx.description}</td>
      <td>${tx.category ?? '—'}</td>
      <td style="text-align:right;color:#dc2626;font-family:monospace;">$${Math.abs(tx.amount).toLocaleString('es-CL')}</td>
      <td>${badge}</td>
    </tr>`
  }).join('')

  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">
    <thead>
      <tr>
        <th style="background:#f9fafb;text-align:left;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">ID</th>
        <th style="background:#f9fafb;text-align:left;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">Fecha</th>
        <th style="background:#f9fafb;text-align:left;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">Descripción</th>
        <th style="background:#f9fafb;text-align:left;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">Categoría</th>
        <th style="background:#f9fafb;text-align:right;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">Monto</th>
        <th style="background:#f9fafb;text-align:left;padding:8px 10px;font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid #e5e7eb;">Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

function getClaimInstructions(type: string): string {
  switch (type) {
    case 'duplicate_commission':
      return 'Presentá este reporte en sucursal o por ejecutivo de cuenta. Solicitá el reverso de la comisión duplicada citando los IDs y montos listados. Citá la Ley del Consumidor Art. 3. El banco tiene 10 días hábiles para responder.'
    case 'installment_error':
      return 'Solicitá el recálculo de las cuotas. Mostrá el comprobante original de la venta en cuotas sin interés junto con las transacciones marcadas en este reporte. Si el banco no corrige, reclamá en la CMF.'
    case 'unknown_charge':
      return 'Solicitá al banco el detalle por escrito de este cargo. Si no pueden justificarlo en 10 días hábiles, exigí el reverso inmediato. Podés escalar a la CMF (cmfchile.cl) si no hay respuesta.'
    case 'incorrect_charge':
      return 'Revisá el detalle del cobro y compáralo con tus registros. Si no corresponde, presentá este reporte en el banco solicitando el reverso del cargo con los datos aquí indicados.'
    default:
      return 'Presentá este reporte en sucursal o por ejecutivo. Solicitá el reverso del cobro injustificado. El banco tiene 10 días hábiles para responder.'
  }
}

export default function DownloadReportButton({ analysis, anomalies, transactions }: Props) {
  const [loading, setLoading] = useState(false)

  const generateHTML = () => {
    const totalRecoverable = formatCLP(analysis.recoverable_amount)
    const date = formatDate(analysis.created_at)
    const today = new Date().toLocaleDateString('es-CL')

    const txMap = new Map<string, ParsedTransaction>()
    transactions.forEach(tx => txMap.set(tx.id, tx))

    const high = anomalies.filter(a => a.severity === 'high').length
    const medium = anomalies.filter(a => a.severity === 'medium').length
    const low = anomalies.filter(a => a.severity === 'low').length

    const cobroCards = anomalies.map((a, i) => {
      const count = a.transactionRefs?.length || 1
      return `<div class="cobro" style="border:1px solid #e5e7eb;border-left:5px solid;${SEVERITY[a.severity]?.borderStyle ?? 'border-left-color:#6b7280;'}border-radius:10px;padding:20px 22px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#111827;">Cobro Nº ${i + 1} — ${getAnomalyTypeLabel(a.type)}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
              <span style="font-size:10px;font-weight:600;padding:3px 10px;border-radius:99px;${SEVERITY[a.severity]?.badgeStyle ?? ''}">${getSeverityLabel(a.severity)}</span>
              <span style="font-size:10px;font-weight:600;padding:3px 10px;border-radius:99px;background:#f3f4f6;color:#374151;">${getAnomalyTypeLabel(a.type)}</span>
              ${count > 1 ? `<span style="font-size:10px;color:#6b7280;">${count} transacciones involucradas</span>` : ''}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;">A reclamar</div>
            <div style="font-size:20px;font-weight:800;color:#dc2626;">${formatCLP(a.recoverableAmount)}</div>
          </div>
        </div>

        <p style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;">${a.title}</p>
        <p style="font-size:12px;color:#6b7280;margin-bottom:4px;">${a.description}</p>
        ${a.detail ? `<p style="font-size:11px;color:#6b7280;margin-bottom:8px;padding:8px 10px;background:#f9fafb;border-radius:6px;font-family:monospace;">${a.detail}</p>` : ''}

        ${buildTransactionTable(a, txMap)}

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-top:12px;">
          <p style="font-size:11px;color:#92400e;margin:0;"><strong style="color:#78350f;">¿Cómo reclamar?</strong> ${getClaimInstructions(a.type)}</p>
        </div>
      </div>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte CobroDetector · ${analysis.file_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111827; padding: 40px 48px; max-width: 840px; margin: 0 auto; line-height: 1.5; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 28px; }
  .logo { font-size: 18px; font-weight: 700; color: #2563eb; margin-bottom: 6px; letter-spacing: -0.3px; }
  .logo span { color: #111827; }
  .title { font-size: 26px; font-weight: 800; color: #111827; margin: 12px 0 6px; letter-spacing: -0.5px; }
  .subtitle { font-size: 13px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .subtitle strong { color: #374151; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 28px 0; }
  .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; }
  .metric-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .metric-value { font-size: 26px; font-weight: 800; color: #111827; }
  .metric-value.danger { color: #dc2626; }
  .metric-value.success { color: #059669; }
  .metric-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .total-banner { background: #dc2626; color: white; border-radius: 12px; padding: 20px 24px; margin: 24px 0; display: flex; justify-content: space-between; align-items: center; }
  .total-banner .label { font-size: 12px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
  .total-banner .label-sub { font-size: 11px; opacity: 0.7; margin-top: 2px; }
  .total-banner .value { font-size: 30px; font-weight: 800; }
  .ai-summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 20px; margin: 24px 0; }
  .ai-summary .ai-label { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .ai-summary p { font-size: 13px; color: #1e40af; line-height: 1.7; }
  .section-title { font-size: 15px; font-weight: 700; color: #111827; margin: 32px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  .section-count { font-size: 12px; font-weight: 500; color: #6b7280; }
  .cobro { page-break-inside: avoid; }
  .instructions { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin-top: 28px; }
  .instructions h3 { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 10px; }
  .instructions ol { font-size: 12px; color: #374151; padding-left: 20px; line-height: 2; }
  .cmf-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px 20px; margin-top: 16px; }
  .cmf-box p { font-size: 12px; color: #991b1b; margin: 0; }
  .cmf-box strong { color: #7f1d1d; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; line-height: 1.8; }
  .footer strong { color: #6b7280; }
  @media print { body { padding: 20px 30px; } .cobro { break-inside: avoid; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo"><span style="color:#2563eb;">Cobro</span><span>Detector</span></div>
  <h1 class="title">Reporte de Cobros Injustificados</h1>
  <div class="subtitle">
    <span>Archivo: <strong>${analysis.file_name}</strong></span>
    <span style="color:#d1d5db;">·</span>
    <span>Banco: <strong>${analysis.bank ?? 'No detectado'}</strong></span>
    <span style="color:#d1d5db;">·</span>
    <span>Analizado: <strong>${date}</strong></span>
  </div>
</div>

<div class="metrics">
  <div class="metric">
    <div class="metric-label">Transacciones analizadas</div>
    <div class="metric-value">${analysis.total_transactions}</div>
    <div class="metric-sub">Estado de cuenta completo</div>
  </div>
  <div class="metric">
    <div class="metric-label">Anomalías detectadas</div>
    <div class="metric-value danger">${anomalies.length}</div>
    <div class="metric-sub">${high} alta · ${medium} media · ${low} baja</div>
  </div>
  <div class="metric">
    <div class="metric-label">Estado</div>
    <div class="metric-value success" style="font-size:16px;">Completado ✓</div>
    <div class="metric-sub">Listo para reclamar</div>
  </div>
</div>

${analysis.ai_summary ? `
<div class="ai-summary">
  <div class="ai-label">Análisis IA · Resumen Ejecutivo</div>
  <p>${analysis.ai_summary}</p>
</div>` : ''}

<div class="total-banner">
  <div>
    <div class="label">Monto total recuperable estimado</div>
    <div class="label-sub">Suma de todos los cobros injustificados detectados</div>
  </div>
  <div class="value">${totalRecoverable}</div>
</div>

<div class="section-title">
  Detalle de Cobros a Reclamar
  <span class="section-count">(${anomalies.length} cobro${anomalies.length !== 1 ? 's' : ''})</span>
</div>

${cobroCards}

<div class="instructions">
  <h3>Instrucciones para reclamar en el banco</h3>
  <ol>
    <li><strong>Imprimí este reporte</strong> o guardalo como PDF desde tu navegador (Ctrl+P → Guardar como PDF)</li>
    <li><strong>Dirigite a una sucursal</strong> del banco o contactá a tu ejecutivo de cuenta</li>
    <li><strong>Presentá el reporte</strong> completo. Cada cobro injustificado está listado con su ID, fecha, monto y motivo de reclamo</li>
    <li><strong>Guardá el comprobante</strong> del reclamo. El banco tiene <strong>10 días hábiles</strong> para responder por ley</li>
    <li><strong>Si no responden o rechazan</strong> tu reclamo, presentá un caso en <strong>cmfchile.cl</strong> o llamá al <strong>800 700 100</strong></li>
  </ol>
</div>

<div class="cmf-box">
  <p><strong>¿El banco no responde?</strong> La Comisión para el Mercado Financiero (CMF) es el regulador bancario en Chile. Podés presentar un reclamo en cmfchile.cl adjuntando este reporte como evidencia.</p>
</div>

<div class="footer">
  <p><strong>CobroDetector</strong> · Reporte generado automáticamente el ${today}</p>
  <p>La detección de cobros injustificados se basa en reglas de negocio bancario chileno y análisis por inteligencia artificial (Llama 3.1 8B via Groq).</p>
  <p>ID de análisis: ${analysis.id} · Este documento no constituye asesoría legal.</p>
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
