import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Lock,
  Trash2,
  ShieldCheck,
  FileText,
  ClipboardList,
  Building2,
  Clock3,
} from 'lucide-react'
import { formatCLP, formatDate, getStatusLabel } from '@/lib/utils'
import type { DetectedAnomaly, ParsedTransaction, Analysis } from '@/domain'
import { buildAnalysisInsights } from '@/lib/analysis-insights'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PriorityGauge } from '@/components/analysis/priority-gauge'
import { FindingsExplorer } from '@/components/analysis/findings-explorer'
import { RecoveryPlan } from '@/components/analysis/recovery-plan'
import { TypeBreakdown } from '@/components/analysis/type-breakdown'
import { ClaimTracker, type ClaimRow } from '@/components/analysis/claim-tracker'
import { ReportSelectionProvider } from '@/components/analysis/report-selection'
import { findingKey } from '@/lib/finding-key'
import { TransactionsTable } from '@/components/analysis/transactions-table'

import DownloadReportButton from './download-report-button'
import PaywallButton from './paywall-button'
import AutoRefresh from './auto-refresh'

interface Props {
  params: { id: string }
}

export const metadata: Metadata = { title: 'Detalle del análisis' }

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

  const { data: claimData } = await supabase
    .from('claim_tracking')
    .select('status, sent_at, response_at, notes')
    .eq('analysis_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  const claim = claimData as ClaimRow | null

  const anomalies = (analysis.anomalies ?? []) as unknown as DetectedAnomaly[]
  const transactions = (analysis.raw_data ?? []) as unknown as ParsedTransaction[]
  const flaggedIds = Array.from(new Set(anomalies.flatMap((anomaly) => anomaly.transactionRefs)))

  const insights = buildAnalysisInsights({
    anomalies: analysis.anomalies,
    totalTransactions: analysis.total_transactions,
    recoverableAmount: analysis.recoverable_amount,
    bank: analysis.bank,
    hasAiSummary: Boolean(analysis.ai_summary),
  })

  const anomalyKeys = insights.findings.map(findingKey)

  const reportUnlocked =
    analysis.status === 'completed' ||
    (analysis.status === 'awaiting_payment' && (analysis.recoverable_amount ?? 0) <= 0)

  if (analysis.status === 'processing' || analysis.status === 'pending') {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <AutoRefresh />
        <Link href="/historial" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al historial
        </Link>

        <Card className="p-8 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </span>
          <h1 className="font-display text-xl font-semibold tracking-tight">Análisis en proceso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos revisando <strong className="text-foreground">{analysis.file_name}</strong>. Esta página se actualiza sola.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Suele tomar menos de 1 minuto.</p>
        </Card>
      </div>
    )
  }

  if (analysis.status === 'error' || analysis.status === 'failed') {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link href="/historial" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al historial
        </Link>

        <Card className="p-8 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-xl font-semibold tracking-tight">El análisis no se completó</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No pudimos procesar <strong className="text-foreground">{analysis.file_name}</strong>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            El archivo puede estar dañado o el servicio no respondió. No se descontó crédito.
          </p>
          <Link
            href="/analisis"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar análisis
          </Link>
        </Card>
      </div>
    )
  }

  if (analysis.status === 'awaiting_payment' && (analysis.recoverable_amount ?? 0) > 0) {
    const pct = Math.round((analysis.recoverable_amount ?? 0) * 0.2)
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Link href="/historial" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al historial
        </Link>

        <Card className="p-7 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="eyebrow">Plan Platino</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Reporte listo para desbloquear</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {analysis.file_name} · {analysis.bank ?? 'Banco no detectado'} · {formatDate(analysis.created_at)}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Hallazgos', value: String(analysis.anomalies_count) },
              { label: 'Recuperable', value: formatCLP(analysis.recoverable_amount) },
              { label: '20% a pagar', value: formatCLP(pct) },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="eyebrow">{metric.label}</p>
                <p className="num mt-1.5 text-base font-semibold text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Paga el 20% de lo recuperado con MercadoPago. El reporte se libera automáticamente al confirmarse el pago.
          </p>
          <div className="mt-5">
            <PaywallButton
              analysisId={params.id}
              recoverableAmount={analysis.recoverable_amount ?? 0}
              fileName={analysis.file_name}
            />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <ReportSelectionProvider analysisId={analysis.id} keys={anomalyKeys}>
      <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/historial" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al historial
          </Link>
          <p className="eyebrow-accent">Expediente</p>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold tracking-tight sm:text-[1.9rem]">
            {analysis.file_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {analysis.bank ?? 'Banco no detectado'} · Analizado el {formatDate(analysis.created_at)} · {getStatusLabel(analysis.status)}
          </p>
        </div>
        {reportUnlocked ? (
          <div className="shrink-0">
            <DownloadReportButton analysis={analysis} anomalies={anomalies} transactions={transactions} />
          </div>
        ) : null}
      </div>

      {/* Monto + prioridad */}
      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Monto recuperable</p>
              <p className="num-display mt-2 text-[2.5rem] font-semibold leading-none tracking-tight text-foreground sm:text-[2.9rem]">
                {formatCLP(insights.recoverable)}
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
                  {insights.counts.total} hallazgos
                </span>
                <span aria-hidden="true">·</span>
                <span>{insights.counts.high} de prioridad alta</span>
                {insights.largest ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Mayor: {formatCLP(insights.largest.amount)}</span>
                  </>
                ) : null}
              </p>
            </div>
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/40 text-muted-foreground sm:flex">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
            <div>
              <p className="eyebrow">Transacciones</p>
              <p className="num mt-1 text-lg font-semibold">{analysis.total_transactions}</p>
            </div>
            <div>
              <p className="eyebrow">Alta prioridad</p>
              <p className="num mt-1 text-lg font-semibold text-danger-600 dark:text-danger-500">{insights.counts.high}</p>
            </div>
            <div>
              <p className="eyebrow">Promedio</p>
              <p className="num mt-1 text-lg font-semibold">{formatCLP(insights.average)}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3.5 py-3">
            <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">{insights.priorityReason}</strong>{" "}
              {insights.hasDiscrepancy
                ? 'El monto guardado no coincide exactamente con la suma de hallazgos; revisa el detalle.'
                : ''}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <PriorityGauge
            confidence={insights.confidence}
            confidenceLabel={insights.confidenceLabel}
            priority={insights.priority}
          />
          <div className="mt-5 space-y-2.5">
            {[
              { label: 'Alta', count: insights.counts.high, bar: 'bg-danger-500' },
              { label: 'Media', count: insights.counts.medium, bar: 'bg-warning-500' },
              { label: 'Baja', count: insights.counts.low, bar: 'bg-muted-foreground' },
            ].map((row) => {
              const total = Math.max(insights.counts.total, 1)
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="num font-semibold text-foreground">{row.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${(row.count / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="hallazgos">
            Hallazgos <span className="num ml-0.5 text-[11px] text-muted-foreground">({insights.counts.total})</span>
          </TabsTrigger>
          <TabsTrigger value="movimientos">
            Movimientos <span className="num ml-0.5 text-[11px] text-muted-foreground">({transactions.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="eyebrow">Diagnóstico</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {analysis.ai_summary ||
                (insights.counts.total > 0
                  ? `Se detectaron ${insights.counts.total} cobros que no calzan con una operación válida por ${formatCLP(insights.recoverable)}. Revisa la pestaña Hallazgos para ver la evidencia de cada uno.`
                  : 'No encontramos cobros injustificados en esta cartola. Revisa los movimientos si quieres validar caso a caso.')}
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <RecoveryPlan steps={insights.actionPlan} bank={analysis.bank} />
            <TypeBreakdown groups={insights.groups} />
          </div>

          <ClaimTracker
            analysisId={analysis.id}
            initial={claim}
            title={`${analysis.file_name} · ${analysis.bank ?? 'Banco'}`}
          />

          <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Regulador: Comisión para el Mercado Financiero (CMF) · cmfchile.cl · 800 700 100.
          </div>
        </TabsContent>

        <TabsContent value="hallazgos">
          {insights.findings.length > 0 ? (
            <FindingsExplorer findings={insights.findings} groups={insights.groups} analysisId={analysis.id} bank={analysis.bank} />
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-success-200 bg-success-50/60 px-6 py-12 text-center dark:border-success-500/25 dark:bg-success-500/5">
              <CheckCircle2 className="h-8 w-8 text-success-600 dark:text-success-500" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-semibold text-foreground">Sin cobros injustificados</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Revisamos {analysis.total_transactions} transacciones y no encontramos duplicados ni irregularidades.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movimientos">
          {transactions.length > 0 ? (
            <TransactionsTable transactions={transactions} flaggedIds={flaggedIds} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No hay movimientos guardados para este análisis.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Seguridad, al final y colapsada */}
      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-success-600 dark:text-success-500" aria-hidden="true" />
            Cómo cuidamos tus datos
          </span>
          <span className="text-[11px] text-muted-foreground group-open:hidden">Ver detalle</span>
          <span className="hidden text-[11px] text-muted-foreground group-open:inline">Ocultar</span>
        </summary>
        <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-3">
          {[
            { icon: Lock, title: 'Encriptado', detail: 'AES-256 antes de salir del navegador' },
            { icon: CheckCircle2, title: 'Procesado', detail: 'Análisis aislado y trazable' },
            { icon: Trash2, title: 'Eliminado', detail: 'El archivo original se borra al terminar' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border/70 bg-secondary/30 p-4">
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <Clock3 className="mr-1 inline h-3 w-3" aria-hidden="true" />
          No almacenamos el contenido original de la cartola, solo los datos del análisis.
        </p>
      </details>
      </div>
    </ReportSelectionProvider>
  )
}
