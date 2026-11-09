import type { Metadata } from 'next'
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileSearch,
  FileText,
  Percent,
  Plus,
  Sparkles,
  TrendingDown,
} from "lucide-react"
import { formatCLP, formatDate } from "@/lib/utils"
import { buildAnalysisMetrics, filterValidAnalyses } from "@/lib/analysis-metrics"
import type { Analysis, Credits, Profile } from "@/types/database.types"
import { DashboardClient } from "./dashboard-client"
import { ActivityChart, RecoveryChart } from "@/components/dashboard-charts"
import { ActivationChecklist } from "@/components/dashboard/activation-checklist"
import { StatCard } from "@/components/ui/stat-card"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export const metadata: Metadata = { title: 'Panel' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [recentResult, statsResult, creditsResult, profileResult] = await Promise.all([
    supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("analyses")
      .select("recoverable_amount, anomalies_count, status, bank, created_at")
      .eq("user_id", user.id),
    supabase.from("credits").select("*").eq("user_id", user.id).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const recentAnalyses = (recentResult.data as Analysis[] | null) ?? []
  const allAnalyses =
    (statsResult.data as Array<
      Pick<Analysis, "recoverable_amount" | "anomalies_count" | "status" | "bank" | "created_at">
    >) ?? []
  const credits = creditsResult.data as Credits | null
  const profile = profileResult.data as Pick<Profile, "full_name"> | null

  const metrics = buildAnalysisMetrics(allAnalyses)
  const validAnalyses = filterValidAnalyses(allAnalyses)
  const creditsLeft = Math.max(0, (credits?.total ?? 0) - (credits?.used ?? 0))
  const creditUsage = credits?.total ? Math.round(((credits.used ?? 0) / credits.total) * 100) : 0

  const completedWithAnomalies = validAnalyses.filter(
    (a) => a.status === "completed" && (a.anomalies_count ?? 0) > 0
  ).length

  const today = new Date()
  const dailyAnalyses = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - index))
    const key = toLocalDateKey(date)
    return {
      day: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][date.getDay()],
      count: allAnalyses.filter((a) => a.created_at && toLocalDateKey(new Date(a.created_at)) === key).length,
      isToday: index === 6,
    }
  })

  const monthlyRecovery = validAnalyses.reduce<Record<string, number>>((acc, a) => {
    const month = a.created_at?.substring(0, 7) ?? "unknown"
    acc[month] = (acc[month] ?? 0) + (a.recoverable_amount ?? 0)
    return acc
  }, {})
  // Serie de los últimos 7 meses, incluyendo meses en cero: un solo punto
  // aislado no permite leer una tendencia.
  const savingsData = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (6 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    return { month: MONTH_NAMES[date.getMonth()], amount: monthlyRecovery[key] ?? 0 }
  })

  const bankStats = validAnalyses.reduce<Record<string, { anomalies: number; recoverable: number }>>(
    (acc, a) => {
      const bank = a.bank ?? "Desconocido"
      if (!acc[bank]) acc[bank] = { anomalies: 0, recoverable: 0 }
      acc[bank].anomalies += a.anomalies_count ?? 0
      acc[bank].recoverable += a.recoverable_amount ?? 0
      return acc
    },
    {}
  )
  const topBank = Object.entries(bankStats)
    .filter(([name]) => name !== "Desconocido")
    .sort(([, a], [, b]) => b.anomalies - a.anomalies)[0]

  const latestWithFindings = recentAnalyses.find(
    (a) => a.status === "completed" && (a.anomalies_count ?? 0) > 0
  )
  const pendingPayment = recentAnalyses.find((a) => a.status === "awaiting_payment")

  const firstName = (profile?.full_name ?? user.email ?? "").split(" ")[0] || "Hola"

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="Panel"
        title={`Hola, ${firstName}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(today.toISOString())}
            <span aria-hidden="true">·</span>
            <span>{metrics.analyses} análisis en total</span>
          </span>
        }
        actions={
          <Link
            href="/analisis"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
            Nuevo análisis
          </Link>
        }
      />

      {/* Hero: recuperación + siguiente paso */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1220] p-6 text-white shadow-sm dark:bg-[#111728] sm:p-7">
          <div className="pointer-events-none absolute inset-0 hero-glow opacity-50" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Monto recuperable detectado
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                <TrendingDown className="h-3 w-3 text-success-500" aria-hidden="true" />
                {metrics.anomalies} hallazgos
              </span>
            </div>

            <p className="num-display mt-4 text-[2.8rem] font-semibold leading-none tracking-tight sm:text-[3.2rem]">
              {formatCLP(metrics.recoverable)}
            </p>

            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-white/70">
              {metrics.recoverable > 0
                ? "Este es el monto que podrías reclamar al banco con la evidencia de tus análisis."
                : "Aún no hay montos recuperables. Sube tu primera cartola y empieza a auditar tus cobros."}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">Análisis</p>
                <p className="num mt-1 text-lg font-semibold">{metrics.analyses}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">Completados</p>
                <p className="num mt-1 text-lg font-semibold">{metrics.completed}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">Con hallazgos</p>
                <p className="num mt-1 text-lg font-semibold">{completedWithAnomalies}</p>
              </div>
            </div>

            <p className="mt-5 border-t border-background/10 pt-3 text-[10px] leading-relaxed text-background/55">
              Estimación basada en la evidencia de tus análisis. El banco valida cada caso con su propio registro.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/historial"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0d1220] transition-transform hover:-translate-y-px"
              >
                Ver historial
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              {latestWithFindings ? (
                <Link
                  href={`/historial/${latestWithFindings.id}`}
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Último reporte
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="eyebrow">Siguiente paso</p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
            {pendingPayment
              ? "Tienes un reporte por desbloquear"
              : creditsLeft === 0
                ? "Necesitas créditos para seguir"
                : metrics.analyses === 0
                  ? "Sube tu primera cartola"
                  : "Revisa tus hallazgos pendientes"}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {pendingPayment
              ? `El reporte de ${pendingPayment.file_name} está listo. Paga el 20% para descargarlo.`
              : creditsLeft === 0
                ? "Compra un plan para analizar nuevas cartolas o usa el Plan Platino sin costo fijo."
                : metrics.analyses === 0
                  ? "Analizamos tu cartola en minutos y te mostramos exactamente qué reclamar."
                  : "Cada hallazgo incluye evidencia y una recomendación concreta para el banco."}
          </p>

          <ActivationChecklist
            hasAnalyses={metrics.analyses > 0}
            hasFindings={completedWithAnomalies > 0}
            latestAnalysisId={latestWithFindings?.id ?? recentAnalyses[0]?.id ?? null}
          />

          <div className="mt-5 flex flex-col gap-2">
            {pendingPayment ? (
              <Link
                href={`/historial/${pendingPayment.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-warning-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-warning-600"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Desbloquear reporte
              </Link>
            ) : (
              <Link
                href="/analisis"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/92"
              >
                <FileSearch className="h-4 w-4" aria-hidden="true" />
                Analizar cartola
              </Link>
            )}
            <Link
              href="/precios"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver planes
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Análisis realizados"
          value={metrics.analyses}
          icon={<BarChart3 className="h-5 w-5" />}
          subTitle={`${metrics.completed} completados`}
          accent="blue"
        />
        <StatCard
          title="Promedio por cartola"
          value={formatCLP(metrics.analyses > 0 ? Math.round(metrics.recoverable / metrics.analyses) : 0)}
          icon={<Percent className="h-5 w-5" />}
          subTitle={`${completedWithAnomalies} con hallazgos`}
          accent={metrics.recoverable > 0 ? "amber" : "slate"}
        />
        <StatCard
          title="Hallazgos"
          value={metrics.anomalies}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subTitle="cobros para revisar"
          accent={metrics.anomalies > 0 ? "red" : "slate"}
        />
        <StatCard
          title="Créditos disponibles"
          value={creditsLeft}
          icon={<Banknote className="h-5 w-5" />}
          subTitle={`${creditUsage}% de tu bolsa utilizada`}
          accent={creditsLeft === 0 ? "red" : "emerald"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Recuperación</p>
              <p className="num-display mt-1 text-xl font-semibold tracking-tight">
                {formatCLP(metrics.recoverable)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              Últimos 7 meses
            </span>
          </div>
          <div className="mt-4">
            {metrics.recoverable > 0 ? (
              <RecoveryChart data={savingsData} />
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-center">
                <Banknote className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-foreground">Sin montos recuperables aún</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Cuando analices una cartola verás aquí la evolución mes a mes.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Actividad</p>
              <p className="num-display mt-1 text-xl font-semibold tracking-tight">
                {dailyAnalyses.reduce((sum, day) => sum + day.count, 0)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">esta semana</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ActivityChart data={dailyAnalyses} />
          </div>
          {topBank ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
              <Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-600 dark:text-warning-500" aria-hidden="true" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                <strong className="font-semibold text-foreground">{topBank[0]}</strong> concentra{" "}
                {topBank[1].anomalies} hallazgos · {formatCLP(topBank[1].recoverable)} recuperable
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Recent */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">Últimos análisis</h2>
          </div>
          <Link
            href="/historial"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Ver todo
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <DashboardClient
          analyses={recentAnalyses}
          emptyState={
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-muted-foreground">
                <FileSearch className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">Aún no tienes análisis</h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Sube tu primera cartola y descubre si tu banco te está cobrando de más.
              </p>
              <Link
                href="/analisis"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Nuevo análisis
              </Link>
            </div>
          }
        />
      </section>
    </div>
  )
}
