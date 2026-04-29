import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ParsedTransaction, DetectedAnomaly } from '@/types/database.types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export async function analyzeTransactionsWithAI(
  transactions: ParsedTransaction[],
  bankName?: string
): Promise<{ anomalies: DetectedAnomaly[]; summary: string }> {
  const txSample = transactions.slice(0, 200)

  const prompt = `Eres un experto en detección de cobros bancarios incorrectos para negocios chilenos. Especialízate en casos de bancos como Santander, BCI, Banco de Chile, etc.

Analiza estas transacciones de un estado de cuenta bancario${bankName ? ` del ${bankName}` : ''} y detecta:

1. **COMISIONES DE CRÉDITO DUPLICADAS EN CUOTAS SIN INTERÉS**: 
   - Las ventas en cuotas sin interés (ej: "VENTA TC 6 CUOTAS S/INT") NO deben tener comisión de crédito en cada cuota.
   - La comisión de apertura/procesamiento se cobra UNA SOLA VEZ (en la primera cuota o inicio).
   - Si ves "COMISION CREDITO", "COM CREDITO", "COMISION TC" repetido en meses consecutivos PARA LA MISMA VENTA, es un cobro injustificado.
   - Caso típico (Santander): Venta de $120.000 en 6 cuotas → comisión de $3.600 se cobra en cuota 1 Y TAMBIÉN en cuotas 2, 3, 4, 5, 6 = ERROR.

2. **ERRORES EN CUOTAS SIN INTERÉS**: Ventas pactadas "sin interés" que tienen montos de cuota inconsistentes, o que incluyen intereses cuando no deberían.

3. **CARGOS NO RECONOCIDOS**: Cargos con descripciones genéricas o en código (ej: "COM ADM", "CARGO SERV") sin relación clara a una operación real.

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
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  const text = result.response.text()

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

  // Regla 1: Comisión de crédito duplicada en ventas a cuotas (CASO SANTANDER)
  const commissionKeywords = ['comision credito', 'com credito', 'comision tc', 'comisión crédito', 'com. credito', 'comision']
  const saleKeywords = ['venta', 'venta tc', 'venta debito', 'abono']
  
  // Buscar patrones: Venta X cuotas + Comisión repetida
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  
  // Detectar ventas a cuotas
  const saleGroups: Record<string, ParsedTransaction[]> = {}
  sorted.forEach(tx => {
    const desc = tx.description.toLowerCase()
    // Detectar patrón: "VENTA TC X CUOTAS" o "CUOTA X/N VENTA"
    const saleMatch = desc.match(/(venta|sale).*?(\d+).*?(cuota|cota)/i) ||
                       desc.match(/(cuota|cota)\s*(\d+)\/.*?(venta|sale)/i)
    if (saleMatch) {
      const key = `${tx.description.substring(0, 20)}-${tx.date.substring(0, 7)}` // Agrupar por descripción y mes
      if (!saleGroups[key]) saleGroups[key] = []
      saleGroups[key].push(tx)
    }
  })
  
  // Para cada grupo de ventas detectadas, buscar comisiones en cuotas consecutivas
  Object.entries(saleGroups).forEach(([key, sales]) => {
    const month = sales[0].date.substring(0, 7)
    // Buscar comisiones en el mismo mes
    const monthCommissions = sorted.filter(tx => 
      tx.date.startsWith(month) &&
      commissionKeywords.some(kw => tx.description.toLowerCase().includes(kw))
    )
    
    if (monthCommissions.length > 1) {
      // Verificar que sea la misma operación (mismo monto aprox)
      const amounts = monthCommissions.map(c => Math.abs(c.amount))
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const isSameCommission = amounts.every(a => Math.abs(a - avgAmount) < 100) // Tolerancia $100
      
      if (isSameCommission) {
        const totalExtra = monthCommissions.slice(1).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        anomalies.push({
          type: 'duplicate_commission',
          severity: 'high',
          title: `Comisión de crédito cobrada ${monthCommissions.length} veces en ${month}`,
          description: `Caso típico: Venta en cuotas sin interés. La comisión de $${Math.abs(monthCommissions[0].amount).toLocaleString('es-CL')} se cobró ${monthCommissions.length} veces, pero debe ser solo 1 vez.`,
          detail: `Banco: Santander/otro · Período: ${month} · Total cobrado: $${amounts.reduce((a, b) => a + b, 0).toLocaleString('es-CL')} · Cobro justo: $${Math.abs(monthCommissions[0].amount).toLocaleString('es-CL')} · Recuperable: $${totalExtra.toLocaleString('es-CL')}`,
          recoverableAmount: totalExtra,
          transactionRefs: monthCommissions.slice(1).map(t => t.id),
        })
      }
    }
  })

  // Regla 2: Comisión de crédito duplicada (método anterior - respaldo)
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
      // Evitar duplicados
      if (!anomalies.some(a => a.title.includes(month))) {
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
