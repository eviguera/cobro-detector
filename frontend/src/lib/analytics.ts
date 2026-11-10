import { createClient } from '@/lib/supabase/server'
import { filterValidAnalyses } from '@/lib/analysis-metrics'
import { ANOMALY_TYPES } from '@/lib/constants'

export interface MonthlyTrend {
  month: string
  analyses: number
  anomalies: number
  recoverable: number
}

export interface BankStat {
  bank: string
  analyses: number
  anomalies: number
  recoverable: number
}

export interface AnomalyTypeStat {
  type: string
  count: number
  totalRecoverable: number
}

export async function getMonthlyTrends(userId: string): Promise<MonthlyTrend[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('analyses')
    .select('created_at, anomalies_count, recoverable_amount, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (!data) return []

  const validData = filterValidAnalyses(data)
  const monthlyMap = new Map<string, MonthlyTrend>()

  for (const analysis of validData) {
    const date = new Date(analysis.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        month: key,
        analyses: 0,
        anomalies: 0,
        recoverable: 0,
      })
    }

    const entry = monthlyMap.get(key)!
    entry.analyses++
    entry.anomalies += analysis.anomalies_count || 0
    entry.recoverable += analysis.recoverable_amount || 0
  }

  return Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
}

export async function getBankStats(userId: string): Promise<BankStat[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('analyses')
    .select('bank, anomalies_count, recoverable_amount, status')
    .eq('user_id', userId)
    .not('bank', 'is', null)

  if (!data) return []

  const validData = filterValidAnalyses(data)
  const bankMap = new Map<string, BankStat>()

  for (const analysis of validData) {
    const bank = analysis.bank || 'Desconocido'
    if (!bankMap.has(bank)) {
      bankMap.set(bank, { bank, analyses: 0, anomalies: 0, recoverable: 0 })
    }
    const entry = bankMap.get(bank)!
    entry.analyses++
    entry.anomalies += analysis.anomalies_count || 0
    entry.recoverable += analysis.recoverable_amount || 0
  }

  return Array.from(bankMap.values()).sort((a, b) => b.anomalies - a.anomalies)
}

export async function getAnomalyTypeStats(userId: string): Promise<AnomalyTypeStat[]> {
  const supabase = await createClient()

  // Solo anomalías de análisis válidos: un análisis fallido no debe sumar
  // hallazgos ni hacer que "tipos" no cuadre con el total del panel.
  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, status')
    .eq('user_id', userId)

  const validIds = filterValidAnalyses(analyses).map((analysis) => analysis.id)
  if (validIds.length === 0) return []

  const { data } = await supabase
    .from('anomalies')
    .select('type, recoverable_amount')
    .eq('user_id', userId)
    .in('analysis_id', validIds)

  if (!data) return []

  const typeMap = new Map<string, AnomalyTypeStat>()

  for (const anomaly of data) {
    if (!typeMap.has(anomaly.type)) {
      typeMap.set(anomaly.type, { type: anomaly.type, count: 0, totalRecoverable: 0 })
    }
    const entry = typeMap.get(anomaly.type)!
    entry.count++
    entry.totalRecoverable += anomaly.recoverable_amount || 0
  }

  return Array.from(typeMap.values()).sort((a, b) => b.count - a.count)
}

export function getTypeLabel(type: string): string {
  return ANOMALY_TYPES[type] ?? type
}
