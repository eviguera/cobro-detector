"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FileSearch,
  TrendingDown,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  BarChart3,
  Activity,
  Sparkles,
  Banknote,
  CalendarDays,
  Building2,
  Percent,
  Brain,
  Shield,
  Clock,
} from "lucide-react"
import { formatCLP, formatDate } from "@/lib/utils"
import type { Analysis, Credits } from "@/types/database.types"
import { DashboardClient } from "./dashboard/dashboard-client"
import { SavingsChart } from "@/components/savings-chart"
import { StatCard } from "@/components/ui/stat-card"
import { StatCardGrid } from "@/components/ui/stat-card-grid"
import { LineChart } from "@/components/ui/line-chart"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function getDayLabel(date: Date, today: Date): string {
  const diff = today.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Hoy"
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  return formatDate(date.toISOString())
}

function getWeekdayLabel(date: Date): string {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  return days[date.getDay()]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [recentResult, statsResult, creditsResult] = await Promise.all([
    supabase
      .from("analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("analyses")
      .select("recoverable_amount, anomalies_count, status, bank, created_at")
      .eq("user_id", user.id),
    supabase.from("credits").select("*").eq("user_id", user.id).single(),
  ])

  const recentAnalysesAll = recentResult.data as Analysis[] | null
  const allAnalyses =
    (statsResult.data as Array<
      Pick<
        Analysis,
        "recoverable_amount" | "anomalies_count" | "status" | "bank" | "created_at"
      >
    >) ?? []
  const credits = creditsResult.data as Credits | null

  const countedAnalyses = allAnalyses.filter(
    (a) => a.status !== "error" && a.status !== "failed"
  )
  const totalRecoverable = countedAnalyses.reduce(
    (sum, a) => sum + (a.recoverable_amount ?? 0),
    0
  )
  const totalAnomalies = countedAnalyses.reduce(
    (sum, a) => sum + (a.anomalies_count ?? 0),
    0
  )
  const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)
  const completedAnalyses = allAnalyses.filter(
    (a) => a.status === "completed"
  ).length
  const totalAnalyses = allAnalyses.length
  const creditUsage = credits?.total
    ? Math.round(((credits?.used ?? 0) / credits.total) * 100)
    : 0

  const completedWithAnomalies = allAnalyses.filter(
    (a) => a.status === "completed" && (a.anomalies_count ?? 0) > 0
  ).length
  const detectionRate =
    completedAnalyses > 0
      ? Math.round((completedWithAnomalies / completedAnalyses) * 100)
      : 0

  const bankStats = countedAnalyses.reduce<
    Record<string, { count: number; anomalies: number; recoverable: number }>
  >((acc, a) => {
    const bank = a.bank ?? "Desconocido"
    if (!acc[bank]) acc[bank] = { count: 0, anomalies: 0, recoverable: 0 }
    acc[bank].count++
    acc[bank].anomalies += a.anomalies_count ?? 0
    acc[bank].recoverable += a.recoverable_amount ?? 0
    return acc
  }, {})

  const topBank = Object.entries(bankStats)
    .filter(([name]) => name !== "Desconocido")
    .sort(([, a], [, b]) => b.anomalies - a.anomalies)[0]

  const toLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`

  const dailyAnalyses: { date: string; count: number; dateObj: Date }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateKey(d)
    const count = allAnalyses?.filter(
      (a) =>
        a.created_at &&
        toLocalDateKey(new Date(a.created_at)) === dateStr
    ).length ?? 0
    dailyAnalyses.push({ date: dateStr, count, dateObj: d })
  }
  const maxDailyCount = Math.max(...dailyAnalyses.map((d) => d.count), 1)

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-blue-500 to-blue-300 rounded-full hidden sm:block" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-subtle" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
              Panel de Control
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 max-w-md">
            Resumen de actividad y detección de cobros injustificados
          </p>
        </div>
        <Link
          href="/analisis"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          Nuevo análisis
        </Link>
      </div>

      {/* Stats Grid */}
      <StatCardGrid>
        <StatCard
          title="Créditos disponibles"
          value={creditsLeft}
          icon={<Banknote className="w-5 h-5" />}
          trend={{
            value: creditUsage.toString(),
            label: "utilizado",
            type: creditUsage > 80 ? "down" : "neutral",
          }}
          subTitle={creditsLeft === 0 ? "Sin créditos" : `${credits?.total ?? 0} totales`}
          accent="blue"
        />
        <StatCard
          title="Análisis realizados"
          value={totalAnalyses}
          icon={<BarChart3 className="w-5 h-5" />}
          trend={{
            value: totalAnalyses.toString(),
            label: "en total",
            type: "up",
          }}
          subTitle={`${completedAnalyses} completados`}
          accent="emerald"
        />
        <StatCard
          title="Tasa de detección"
          value={detectionRate > 0 ? `${detectionRate}%` : "0%"}
          icon={<Percent className="w-5 h-5" />}
          trend={{
            value: detectionRate > 0 ? `${detectionRate}%` : "0%",
            label: "casos con anomalías",
            type: detectionRate > 50 ? "up" : detectionRate > 0 ? "neutral" : "down",
          }}
          subTitle={`${completedWithAnomalies} de ${completedAnalyses} completados`}
          accent={detectionRate > 0 ? "red" : "slate"}
        />
        <StatCard
          title="Monto recuperable"
          value={formatCLP(totalRecoverable)}
          icon={<TrendingDown className="w-5 h-5" />}
          trend={{
            value: totalRecoverable > 0 ? "Listo" : "Sin datos",
            label: "para reclamar",
            type: totalRecoverable > 0 ? "up" : "neutral",
          }}
          subTitle={
            totalRecoverable > 0
              ? "Listo para reclamar al banco"
              : "Sube un estado de cuenta para comenzar"
          }
          accent="red"
        />
      </StatCardGrid>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Left Column - Savings Chart + Insights */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BarChart3 className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    Evolución de ahorros
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Recuperable mensual
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {dailyAnalyses.reduce((s, d) => s + d.count, 0)} total
              </span>
            </div>
            <LineChart
              data={dailyAnalyses.map((d, i) => ({
                name: getWeekdayLabel(d.dateObj),
                value: d.count,
              }))}
              height={200}
              color="var(--primary)"
              showPoints
            />
          </Card>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Brain className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    Insights
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Resumen inteligente
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {topBank && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {topBank[0]}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {topBank[1].anomalies} anomalías ·
                      {formatCLP(topBank[1].recoverable)} recuperable
                    </p>
                  </div>
                </div>
              )}

              {totalAnomalies > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Promedio por análisis
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {(totalAnomalies / (completedWithAnomalies || 1)).toFixed(1)} anomalías por caso
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Última actividad
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {(recentAnalysesAll?.length ?? 0) > 0
                      ? getDayLabel(new Date(recentAnalysesAll![0].created_at), today)
                      : "Sin actividad"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Recent Analyses */}
        <div className="lg:col-span-1">
          <DashboardClient analyses={recentAnalysesAll ?? []}
            emptyState={
              <div className="bg-white dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-800/40 text-center py-16 px-6 shadow-sm">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 flex items-center justify-center shadow-inner">
                  <FileSearch className="w-6 h-6 text-gray-400 dark:text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Aún no tienes análisis
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
                  Sube tu primer estado de cuenta y descubre si tu banco te está
                  cobrando de más
                </p>
                <Link
                  href="/analisis"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20 dark:shadow-blue-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  Nuevo análisis
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}