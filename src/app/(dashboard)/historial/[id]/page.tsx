import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle2, FileDown, RotateCcw } from 'lucide-react'
import { formatCLP, formatDate, getAnomalyTypeLabel, getSeverityLabel, getStatusLabel } from '@/lib/utils'
import type { DetectedAnomaly, ParsedTransaction, Analysis } from '@/types/database.types'
import AnomalyStatusButton from './anomaly-status-button'
import DownloadReportButton from './download-report-button'

interface Props {
  params: { id: string }
}

const SEVERITY_STYLE: Record<string, string> = {
  high:   'border-l-red-500 bg-red-50',
  medium: 'border-l-amber-500 bg-amber-50',
  low:    'border-l-blue-500 bg-blue-50',
}

const SEVERITY_BADGE: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-blue-100 text-blue-700',
}

export default async function AnalysisDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: analysisData } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  const analysis = analysisData as Analysis | null
  if (!analysis) notFound()

  const anomalies = (analysis.anomalies ?? []) as unknown as DetectedAnomaly[]
  const transactions = (analysis.raw_data ?? []) as unknown as ParsedTransaction[]
  const flaggedIds = new Set(anomalies.flatMap(a => a.transactionRefs))

  const totalHigh   = anomalies.filter(a => a.severity === 'high').length
  const totalMedium = anomalies.filter(a => a.severity === 'medium').length
  const totalLow    = anomalies.filter(a => a.severity === 'low').length

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/historial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al historial
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{analysis.file_name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {analysis.bank ?? 'Banco no detectado'} · Analizado el {formatDate(analysis.created_at)}
          </p>
        </div>
        <DownloadReportButton analysis={analysis} anomalies={anomalies} />
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Transacciones', value: analysis.total_transactions, sub: 'analizadas', color: '' },
          { label: 'Anomalías', value: analysis.anomalies_count, sub: `${totalHigh} alta · ${totalMedium} media · ${totalLow} baja`, color: 'text-red-600' },
          { label: 'Monto recuperable', value: formatCLP(analysis.recoverable_amount), sub: 'estimado', color: 'text-green-700', lg: true },
          { label: 'Estado', value: getStatusLabel(analysis.status), sub: analysis.status === 'completed' ? 'Listo para reclamar' : '', color: 'text-blue-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-1">{m.label}</p>
            <p className={`font-bold ${m.lg ? 'text-xl' : 'text-2xl'} ${m.color || 'text-foreground'}`}>{m.value}</p>
            {m.sub && <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {analysis.ai_summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Análisis IA · Resumen ejecutivo</p>
          <p className="text-sm text-blue-900 leading-relaxed">{analysis.ai_summary}</p>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 ? (
        <div className="mb-8">
          <h2 className="font-semibold text-foreground mb-4">
            Cobros incorrectos detectados
            <span className="ml-2 text-sm font-normal text-gray-400">({anomalies.length})</span>
          </h2>

          <div className="space-y-3">
            {anomalies.map((anomaly, i) => (
              <div key={i} className={`border-l-4 rounded-xl border border-gray-200 p-5 ${SEVERITY_STYLE[anomaly.severity] ?? 'bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[anomaly.severity]}`}>
                        {getSeverityLabel(anomaly.severity)}
                      </span>
                      <span className="text-xs text-muted-foreground bg-white/80 px-2 py-0.5 rounded-full border border-border">
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">{anomaly.title}</p>
                    <p className="text-sm text-gray-600 mb-1">{anomaly.description}</p>
                    {anomaly.detail && (
                      <p className="text-xs text-gray-400 font-mono bg-white/60 rounded px-2 py-1 inline-block mt-1">
                        {anomaly.detail}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">Monto recuperable</p>
                    <p className="text-xl font-bold text-foreground">{formatCLP(anomaly.recoverableAmount)}</p>
                  </div>
                </div>

                {/* How to claim */}
                <div className="mt-4 pt-4 border-t border-white/60">
                  <p className="text-xs font-medium text-gray-600 mb-1">¿Cómo reclamar?</p>
                  <p className="text-xs text-muted-foreground">
                    {anomaly.type === 'duplicate_commission' &&
                      'Presenta este reporte en sucursal o por ejecutivo de cuenta. Solicita reverso de comisiones duplicadas citando los montos y fechas. El banco tiene 10 días hábiles para responder.'}
                    {anomaly.type === 'installment_error' &&
                      'Solicita recalculo de cuotas. Muestra el comprobante original de la venta en cuotas sin interés y las cuotas cobradas incorrectamente.'}
                    {anomaly.type === 'unknown_charge' &&
                      'Solicita detalle del cargo por escrito. Si no pueden justificarlo, exige reverso inmediato. Puedes escalar a la CMF si el banco no responde en 10 días.'}
                    {anomaly.type === 'incorrect_charge' &&
                      'Revisa el detalle del cobro y compáralo con tus registros. Si no corresponde, presenta este reporte en el banco solicitando el reverso del cargo.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-8">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-green-900 mb-1">¡Sin anomalías detectadas!</p>
          <p className="text-sm text-green-700">No encontramos cobros duplicados ni irregularidades en este estado de cuenta.</p>
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 && (
          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">
              Transacciones
              <span className="ml-2 text-sm font-normal text-muted-foreground">({transactions.length})</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" /> Marcada como anomalía
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => {
                  const isFlagged = flaggedIds.has(tx.id)
                  return (
                    <tr key={tx.id} className={isFlagged ? 'bg-red-50' : 'hover:bg-muted'}>
                      <td className="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">{tx.date}</td>
                      <td className="px-6 py-3 text-foreground max-w-xs truncate">
                        {tx.description}
                        {isFlagged && (
                          <AlertTriangle className="inline w-3 h-3 text-red-400 ml-1.5" />
                        )}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono text-xs whitespace-nowrap ${
                        tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.amount < 0 ? '-' : '+'}{formatCLP(Math.abs(tx.amount))}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {isFlagged ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Revisar</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CMF info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">¿El banco no responde? Puedes escalar a la CMF</p>
        <p>La Comisión para el Mercado Financiero (CMF) es el regulador bancario en Chile. Puedes presentar un reclamo en <strong>cmfchile.cl</strong> si el banco no resuelve tu caso en 10 días hábiles.</p>
      </div>
    </div>
  )
}
