import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, RotateCcw, Lock, Trash2, ShieldCheck } from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'
import type { DetectedAnomaly, ParsedTransaction, Analysis } from '@/domain'
import { AnomalyCard } from '@/components/anomaly-card'
import { SecurityBadge } from '@/components/security-badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHeaderCell, TableRow, TableCell } from '@/components/ui/table'

import DownloadReportButton from './download-report-button'
import PaywallButton from './paywall-button'
import AutoRefresh from './auto-refresh'

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

  // Platino sin monto recuperable no tiene nada que cobrar: el reporte es libre.
  const reportUnlocked =
    analysis.status === 'completed' ||
    (analysis.status === 'awaiting_payment' && (analysis.recoverable_amount ?? 0) <= 0)

  if (analysis.status === 'processing' || analysis.status === 'pending') {
    return (
      <div className="animate-fade-in max-w-2xl">
        <AutoRefresh />
        <Link href="/historial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al historial
        </Link>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-8 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Análisis en proceso
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Estamos revisando <strong>{analysis.file_name}</strong>. Esta página se actualiza sola.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Suele tomar menos de 1 minuto. Puedes volver más tarde desde el historial.
          </p>
        </div>
      </div>
    )
  }

  if (analysis.status === 'error' || analysis.status === 'failed') {
    return (
      <div className="animate-fade-in max-w-2xl">
        <Link href="/historial" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al historial
        </Link>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-8 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            El análisis no se completó
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            No pudimos procesar <strong>{analysis.file_name}</strong>.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            El archivo puede estar dañado o el servicio no respondió. Intenta subirlo de nuevo.
          </p>
          <Link
            href="/analisis"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar análisis
          </Link>
        </div>
      </div>
    )
  }

  if (analysis.status === 'awaiting_payment' && (analysis.recoverable_amount ?? 0) > 0) {
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
          <PaywallButton
            analysisId={params.id}
            recoverableAmount={analysis.recoverable_amount ?? 0}
            fileName={analysis.file_name}
          />
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
          {/* Badge de confianza */}
          <SecurityBadge variant="compact" className="mt-3" />
        </div>
        {reportUnlocked && (
          <DownloadReportButton analysis={analysis} anomalies={anomalies} transactions={transactions} />
        )}
      </div>

      {/* Estado de seguridad del análisis */}
      <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 p-6 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Estado de seguridad
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Encriptado',
              subtitle: 'AES-256',
              icon: Lock,
              status: 'Activo',
              statusColor: 'text-emerald-600 dark:text-emerald-400',
              cardBg: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40',
              iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
            },
            {
              title: 'Procesado',
              subtitle: 'Análisis completo',
              icon: CheckCircle2,
              status:
                analysis.status === 'completed'
                  ? 'Completado'
                  : analysis.status === 'processing' || analysis.status === 'pending'
                    ? 'En proceso'
                    : analysis.status === 'awaiting_payment'
                      ? 'Pendiente de pago'
                      : 'Error',
              statusColor:
                analysis.status === 'completed'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : analysis.status === 'error' || analysis.status === 'failed'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400',
              cardBg: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40',
              iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            },
            {
              title: 'Eliminado',
              subtitle: 'CSV auto-eliminado',
              icon: Trash2,
              status: 'Sí (tras procesar)',
              statusColor: 'text-amber-600 dark:text-amber-400',
              cardBg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40',
              iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
            },
          ].map((item) => (
            <div key={item.title} className={`${item.cardBg} rounded-xl p-4`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mb-3 ${item.iconBg}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                {item.title}
              </p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-1.5 leading-tight">
                {item.subtitle}
              </p>
              <p className={`text-sm font-bold ${item.statusColor}`}>{item.status}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Tu archivo se procesa de forma segura y se elimina automáticamente del servidor una vez finalizado el análisis. No almacenamos el contenido original del CSV.
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Transacciones', value: analysis.total_transactions, sub: 'analizadas', color: '' },
          { label: 'Anomalías', value: analysis.anomalies_count, sub: `${totalHigh} alta · ${totalMedium} media · ${totalLow} baja`, color: 'text-red-600' },
          { label: 'Monto recuperable', value: formatCLP(analysis.recoverable_amount), sub: 'estimado', color: 'text-green-700', lg: true },
          { label: 'Estado', value: getStatusLabel(analysis.status), sub: analysis.status === 'completed' ? 'Listo para reclamar' : '', color: 'text-blue-600' },
        ].map(m => (
          <Card key={m.label} className="p-5">
            <p className="text-xs text-gray-400 mb-1">{m.label}</p>
            <p className={`font-bold ${m.lg ? 'text-xl' : 'text-2xl'} ${m.color || 'text-foreground'}`}>{m.value}</p>
            {m.sub && <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>}
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      {analysis.ai_summary && (
        <Card className="p-5 mb-6">
          <CardHeader>
            <CardTitle className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
              Análisis IA · Resumen ejecutivo
            </CardTitle>
          </CardHeader>
          <div className="p-0">
            <p className="text-sm text-blue-900 leading-relaxed">{analysis.ai_summary}</p>
          </div>
        </Card>
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
              <AnomalyCard
                key={i}
                variant="full"
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
        <Card className="mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Marcada como anomalía</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Descripción</TableHeaderCell>
                  <TableHeaderCell className="text-right">Monto</TableHeaderCell>
                  <TableHeaderCell className="text-center">Estado</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => {
                  const isFlagged = flaggedIds.has(tx.id)
                  return (
                    <TableRow key={tx.id} className={isFlagged ? 'bg-red-50' : ''}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell className="text-foreground max-w-xs truncate flex items-center gap-1.5">
                        {tx.description}
                        {isFlagged && (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs whitespace-nowrap ${
                        tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.amount < 0 ? '-' : '+'}{formatCLP(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        {isFlagged ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Revisar</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* CMF info */}
      <Card className="p-5">
        <p className="font-medium text-foreground mb-1">¿El banco no responde? Puedes escalar a la CMF</p>
        <p className="text-sm text-muted-foreground">
          La Comisión para el Mercado Financiero (CMF) es el regulador bancario en Chile. Puedes presentar un reclamo en <strong className="text-foreground">cmfchile.cl</strong> si el banco no resuelve tu caso en 10 días hábiles.
        </p>
      </Card>
    </div>
  )
}
