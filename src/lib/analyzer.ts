import Anthropic from '@anthropic-ai/sdk'
import type { ParsedTransaction, DetectedAnomaly } from '@/types/database.types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function analyzeTransactionsWithAI(
  transactions: ParsedTransaction[],
  bankName?: string
): Promise<{ anomalies: DetectedAnomaly[]; summary: string }> {
  const txSample = transactions.slice(0, 200) // máx 200 para el contexto

  const prompt = `Eres un experto en detección de cobros bancarios incorrectos para negocios chilenos.

Analiza estas transacciones de un estado de cuenta bancario${bankName ? ` del ${bankName}` : ''} y detecta:

1. **COMISIONES DE CRÉDITO DUPLICADAS**: La comisión de apertura/procesamiento de una venta en cuotas debe cobrarse UNA SOLA VEZ (al inicio), no en cada cuota mensual. Si ves "COMISION CREDITO", "COM CREDITO", "COMISION TC" o similar repetido más de una vez para la misma operación o periodo, es un cobro injustificado.

2. **ERRORES EN CUOTAS SIN INTERÉS**: Ventas pactadas "sin interés" que tienen montos de cuota inconsistentes, o que incluyen intereses cuando no deberían.

3. **CARGOS NO RECONOCIDOS**: Cargos con descripciones genéricas o en código (ej: "COM ADM", "CARGO SERV", códigos alfanuméricos) sin relación clara a una operación real.

4. **COBROS DUPLICADOS**: Misma operación cobrada dos veces en el mismo período o con pocos días de diferencia.

Transacciones a analizar (formato JSON):
${JSON.stringify(txSample, null, 2)}

Responde SOLO en JSON con esta estructura exacta:
{
  "anomalies": [
    {
      "type": "duplicate_commission" | "installment_error" | "unknown_charge",
      "severity": "high" | "medium" | "low",
      "title": "Título breve de la anomalía",
      "description": "Descripción clara del problema en 1-2 oraciones",
      "detail": "Detalle técnico: fechas, montos, IDs de transacción involucrados",
      "recoverableAmount": 12345,
      "transactionRefs": ["id1", "id2"]
    }
  ],
  "summary": "Resumen ejecutivo en 2-3 oraciones explicando las principales anomalías encontradas y el monto total recuperable estimado en pesos chilenos."
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json\n?|```\n?/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      anomalies: parsed.anomalies ?? [],
      summary: parsed.summary ?? '',
    }
  } catch {
    return { anomalies: [], summary: 'No se pudo completar el análisis automático.' }
  }
}

// Motor de reglas determinístico (rápido, sin IA)
export function detectAnomaliesRules(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []

  // Regla 1: Comisión de crédito duplicada en el mismo mes
  const commissionKeywords = ['comision credito', 'com credito', 'comision tc', 'comisión crédito', 'com. credito']
  const commissions = transactions.filter(tx =>
    commissionKeywords.some(kw => tx.description.toLowerCase().includes(kw))
  )

  // Agrupar comisiones por mes
  const commissionsByMonth: Record<string, ParsedTransaction[]> = {}
  commissions.forEach(tx => {
    const month = tx.date.substring(0, 7) // YYYY-MM
    if (!commissionsByMonth[month]) commissionsByMonth[month] = []
    commissionsByMonth[month].push(tx)
  })

  Object.entries(commissionsByMonth).forEach(([month, txs]) => {
    if (txs.length > 1) {
      const totalExtra = txs.slice(1).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      anomalies.push({
        type: 'duplicate_commission',
        severity: 'high',
        title: `Comisión de crédito cobrada ${txs.length} veces en ${month}`,
        description: `La comisión de crédito debe cobrarse solo una vez por operación, pero se detectaron ${txs.length} cobros en el mismo período.`,
        detail: `Período: ${month} · Cobros: ${txs.map(t => `$${Math.abs(t.amount).toLocaleString('es-CL')}`).join(', ')} · Monto recuperable: $${totalExtra.toLocaleString('es-CL')}`,
        recoverableAmount: totalExtra,
        transactionRefs: txs.slice(1).map(t => t.id),
      })
    }
  })

  // Regla 2: Montos idénticos en ventana de 7 días (posible duplicado)
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  const checked = new Set<string>()

  sorted.forEach((tx, i) => {
    if (checked.has(tx.id)) return
    const txDate = new Date(tx.date)
    const duplicates = sorted.filter((other, j) => {
      if (j <= i || checked.has(other.id)) return false
      const otherDate = new Date(other.date)
      const diffDays = Math.abs((txDate.getTime() - otherDate.getTime()) / (1000 * 60 * 60 * 24))
      return (
        diffDays <= 7 &&
        Math.abs(tx.amount) === Math.abs(other.amount) &&
        tx.amount < 0 && // solo cobros (negativos)
        other.amount < 0 &&
        tx.description.toLowerCase().includes(other.description.toLowerCase().substring(0, 8))
      )
    })

    if (duplicates.length > 0) {
      checked.add(tx.id)
      duplicates.forEach(d => checked.add(d.id))
      const totalDup = duplicates.reduce((sum, d) => sum + Math.abs(d.amount), 0)
      anomalies.push({
        type: 'duplicate_commission',
        severity: 'high',
        title: `Cobro duplicado: ${tx.description}`,
        description: `Se detectó el mismo monto cobrado ${duplicates.length + 1} veces en un período de 7 días.`,
        detail: `Monto: $${Math.abs(tx.amount).toLocaleString('es-CL')} · Fechas: ${[tx, ...duplicates].map(t => t.date).join(', ')}`,
        recoverableAmount: totalDup,
        transactionRefs: duplicates.map(d => d.id),
      })
    }
  })

  // Regla 3: Cargos con descripción genérica/código
  const unknownPatterns = /^(com\s|cargo\s|serv\s|fee\s|cob\s|adm\s)/i
  const unknownCharges = transactions.filter(tx =>
    tx.amount < 0 &&
    (unknownPatterns.test(tx.description) || tx.description.length < 6) &&
    Math.abs(tx.amount) > 1000
  )

  unknownCharges.forEach(tx => {
    anomalies.push({
      type: 'unknown_charge',
      severity: 'low',
      title: `Cargo no identificado: "${tx.description}"`,
      description: 'Este cargo tiene una descripción genérica o en código sin asociación clara a una operación conocida.',
      detail: `Fecha: ${tx.date} · Monto: $${Math.abs(tx.amount).toLocaleString('es-CL')} · Descripción: ${tx.description}`,
      recoverableAmount: Math.abs(tx.amount),
      transactionRefs: [tx.id],
    })
  })

  return anomalies
}
