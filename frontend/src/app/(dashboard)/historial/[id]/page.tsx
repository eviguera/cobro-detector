import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'
import type { DetectedAnomaly, ParsedTransaction, Analysis } from '@/domain'
import { AnomalyCard } from '@/components/anomaly-card'

import DownloadReportButton from './download-report-button'
import PaywallButton from './paywall-button'

interface Props {
  params: { id: string }
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

  if (analysis.status === 'awaiting_payment') {
    const pct = Math.round((analysis.recoverable_amount ?? 0) * 0.2)
    return (
      <div className="animate-fade-in max-w-2xl">
        <Link href="/historial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al historial
        </Link>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-8 shadow-sm text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reporte bloqueado</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Plan Platino — Pagas solo el 20% de lo que recuperes</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {analysis.file_name} · {analysis.bank ?? 'Banco no detectado'} · {formatDate(analysis.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Anomalías', value: analysis.anomalies_count, color: 'text-red-600' },
            { label: 'Monto recuperable', value: formatCLP(analysis.recoverable_amount), color: 'text-green-700', lg: true },
            { label: '20% a pagar', value: formatCLP(pct), color: 'text-amber-600', lg: true },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-800/40 p-4">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`font-bold ${m.lg ? 'text-lg' : 'text-xl'} ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6 shadow-sm">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 text-center">
            Para desbloquear el reporte completo, realizá el pago del 20% ({formatCLP(pct)}) a través de MercadoPago.
          </p>
          <PaywallButton analysisId={params.id} amount={pct} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-3">
            El reporte se libera automáticamente al acreditarse el pago
          </p>
        </div>
      </div>
    )
  }

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
        <DownloadReportButton analysis={analysis} anomalies={anomalies} transactions={transactions} />
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
              <AnomalyCard.Full
                key={i}
                type={anomaly.type}
                severity={anomaly.severity}
                title={anomaly.title}
                description={anomaly.description}
                detail={anomaly.detail}
                recoverableAmount={anomaly.recoverableAmount}
              />
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
