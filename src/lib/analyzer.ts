import Groq from 'groq-sdk'
import type { ParsedTransaction, DetectedAnomaly } from '@/types/database.types'
import { sanitizeTransactions, sanitizeBankName } from '@/lib/security'
import { parseExcelFile, parsePDFFile, detectBank } from './parser'

let groqInstance: Groq | null = null

function getGroq(): Groq {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqInstance
}

export interface AnalysisResult {
  anomalies: DetectedAnomaly[]
  totalTransactions: number
  totalRecoverable: number
  period?: { start: string; end: string }
  bank?: string
  aiSummary?: string
  success?: boolean
  error?: string
  transactions?: ParsedTransaction[]
}

export async function analyzeTransactionsWithAI(
  transactions: ParsedTransaction[],
  bankName?: string
): Promise<{ anomalies: DetectedAnomaly[]; summary: string }> {
  const txSample = sanitizeTransactions(transactions.slice(0, 200))

  const systemPrompt = `Eres un experto en detección de cobros bancarios incorrectos para negocios chilenos. Siempre respondes SOLO en JSON válido.`

  const userPrompt = `Analiza estas transacciones de un estado de cuenta bancario${bankName ? ` del ${sanitizeBankName(bankName)}` : ''} y detecta:

1. **COMISIONES DE CRÉDITO DUPLICADAS EN CUOTAS SIN INTERÉS**: 
   - Las ventas en cuotas sin interés NO deben tener comisión de crédito en cada cuota.
   - La comisión se cobra UNA SOLA VEZ.
   - Caso Santander: Venta en cuotas → comisión repetida = ERROR.

2. **ERRORES EN CUOTAS SIN INTERÉS**: Ventas "sin interés" con montos inconsistentes o intereses.

3. **CARGOS NO RECONOCIDOS**: Cargos genéricos sin relación clara a una operación.

4. **COBROS DUPLICADOS**: Misma operación cobrada dos veces.

<DATOS>
${JSON.stringify(txSample, null, 2)}
</DATOS>

Responde SOLO JSON con esta estructura exacta:
{
  "anomalies": [
    {
      "type": "duplicate_commission",
      "severity": "high",
      "title": "Título breve",
      "description": "Descripción clara",
      "detail": "Detalle técnico",
      "recoverableAmount": 12345,
      "transactionRefs": ["id1"]
    }
  ],
  "summary": "Resumen en 2-3 oraciones"
}`

  try {
    const chatCompletion = await getGroq().chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const text = chatCompletion.choices[0]?.message?.content || ''
    const clean = text.replace(/```json\n?|```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    const anomalies = Array.isArray(parsed.anomalies)
      ? parsed.anomalies.filter((a: any) =>
          a &&
          typeof a.type === 'string' &&
          typeof a.title === 'string' &&
          typeof a.recoverableAmount === 'number'
        )
      : []

    return {
      anomalies: anomalies.slice(0, 50),
      summary: typeof parsed.summary === 'string' ? parsed.summary.substring(0, 500) : '',
    }
  } catch (error) {
    console.error('Error en analyzeTransactionsWithAI:', error)
    return { anomalies: [], summary: 'No se pudo completar el análisis automático.' }
  }
}

// Motor de reglas determinístico (rápido, sin IA)
export function detectAnomaliesRules(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []

  // Regla 1: Comisión de crédito duplicada en ventas a cuotas (CASO SANTANDER)
  const commissionKeywords = ['comision credito', 'com credito', 'comision tc', 'comisión crédito', 'com. credito', 'comissao credito']
  const saleKeywords = ['venta', 'venta tc', 'venta debito', 'abono']
  
  // Buscar patrones: Venta X cuotas + Comisión repetida
  const sortedTxs = [...transactions].sort((a: any, b: any) => a.date.localeCompare(b.date))
  
  // Detectar ventas a cuotas
  const saleGroups: Record<string, any[]> = {}
  sortedTxs.forEach((tx: any) => {
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
  
  // Para cada grupo de ventas detectadas, buscar comisiones relacionadas
  Object.entries(saleGroups).forEach(([key, sales]: [string, any[]]) => {
    const month = sales[0].date.substring(0, 7)
    // Extraer palabras clave del comercio desde la descripción de venta
    const saleDesc = sales[0].description.toLowerCase()
    const stopWords = ['venta', 'tc', 'cuotas', 'cota', 'sin', 'interes', 'credito', 'debito', 'abono', 'sale', 'cuota']
    const merchantWords = saleDesc
      .split(/[\s]+/)
      .filter(w => w.length > 2 && !stopWords.includes(w))
    // Buscar comisiones que compartan palabras con la venta (ej: "RIPLEY")
    const relatedCommissions = sortedTxs.filter((tx: any) =>
      tx.date.startsWith(month) &&
      commissionKeywords.some(kw => tx.description.toLowerCase().includes(kw)) &&
      merchantWords.some(w => tx.description.toLowerCase().includes(w))
    )
    
    if (relatedCommissions.length > 1) {
      // Verificar que sea la misma operación (mismo monto aprox)
      const amounts = relatedCommissions.map((c: any) => Math.abs(c.amount))
      const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length
      const isSameCommission = amounts.every((a: number) => Math.abs(a - avgAmount) < 100) // Tolerancia $100
      
      if (isSameCommission) {
        const totalExtra = relatedCommissions.slice(1).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
        anomalies.push({
          type: 'duplicate_commission',
          severity: 'high',
          title: `Comisión de crédito cobrada ${relatedCommissions.length} veces en ${month}`,
          description: `Caso típico: Venta en cuotas sin interés. La comisión de $${Math.abs(relatedCommissions[0].amount).toLocaleString('es-CL')} se cobró ${relatedCommissions.length} veces, pero debe ser solo 1 vez.`,
          detail: `Banco: Santander/otro · Período: ${month} · Total cobrado: $${amounts.reduce((a: number, b: number) => a + b, 0).toLocaleString('es-CL')} · Cobro justo: $${Math.abs(relatedCommissions[0].amount).toLocaleString('es-CL')} · Recuperable: $${totalExtra.toLocaleString('es-CL')}`,
          recoverableAmount: totalExtra,
          transactionRefs: relatedCommissions.slice(1).map((t: any) => t.id),
        })
      }
    }
  })

  // Regla 2: Comisión de crédito duplicada (método anterior - respaldo)
  const commissions = transactions.filter(tx =>
    commissionKeywords.some(kw => tx.description.toLowerCase().includes(kw))
  )

  // Agrupar comisiones por mes y monto (evita mezclar distintos tipos de comisión)
  const commissionsByGroup: Record<string, ParsedTransaction[]> = {}
  commissions.forEach(tx => {
    const month = tx.date.substring(0, 7)
    const amountKey = Math.round(Math.abs(tx.amount) / 100).toString()
    const group = `${month}-${amountKey}`
    if (!commissionsByGroup[group]) commissionsByGroup[group] = []
    commissionsByGroup[group].push(tx)
  })

  Object.entries(commissionsByGroup).forEach(([group, txs]) => {
    if (txs.length > 1) {
      const totalExtra = txs.slice(1).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      const month = group.split('-')[0]
      // Evitar duplicados con Regla 1a
      if (!anomalies.some(a => a.title.includes(month))) {
        anomalies.push({
          type: 'duplicate_commission',
          severity: 'high',
          title: `Comisión de crédito cobrada ${txs.length} veces en ${month}`,
          description: `La comisión de crédito debe cobrarse solo una vez por operación, pero se detectaron ${txs.length} cobros del mismo monto en el mismo período.`,
          detail: `Período: ${month} · Monto: $${Math.abs(txs[0].amount).toLocaleString('es-CL')} cada una · Cobros: ${txs.length} · Monto recuperable: $${totalExtra.toLocaleString('es-CL')}`,
          recoverableAmount: totalExtra,
          transactionRefs: txs.slice(1).map(t => t.id),
        })
      }
    }
  })

  // Regla 2: Montos idénticos en ventana de 7 días (posible duplicado)
  const checked = new Set<string>()
  const sortedTxs2 = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  sortedTxs2.forEach((tx: any, i: number) => {
    if (checked.has(tx.id)) return
    const txDate = new Date(tx.date)
    const duplicates = sortedTxs2.filter((other: any, j: number) => {
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
      duplicates.forEach((d: any) => checked.add(d.id))
      const totalDup = duplicates.reduce((sum: number, d: any) => sum + Math.abs(d.amount), 0)
      anomalies.push({
        type: 'duplicate_commission',
        severity: 'high',
        title: `Cobro duplicado: ${tx.description}`,
        description: `Se detectó el mismo monto cobrado ${duplicates.length + 1} veces en un período de 7 días.`,
        detail: `Monto: $${Math.abs(tx.amount).toLocaleString('es-CL')} · Fechas: ${[tx, ...duplicates].map((t: any) => t.date).join(', ')}`,
        recoverableAmount: totalDup,
        transactionRefs: duplicates.map((d: any) => d.id),
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

function detectLabeledAnomalies(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []
  const processed = new Set<string>()

  // Mapa: id → transacción para búsqueda rápida
  const txMap = new Map<string, ParsedTransaction>()
  transactions.forEach(tx => txMap.set(tx.id, tx))

  // Mapeo de tipos de anomalía del CSV a tipos internos
  const typeMap: Record<string, { type: string; severity: 'high' | 'medium' | 'low' }> = {
    COBRO_DOBLE: { type: 'duplicate_commission', severity: 'high' },
    COBRO_ALTO_DUPLICADO: { type: 'duplicate_commission', severity: 'high' },
    COBRO_INCORRECTO: { type: 'incorrect_charge', severity: 'medium' },
  }

  transactions.forEach(tx => {
    const rawType = tx.tipoAnomalia
    if (!rawType || processed.has(tx.id)) return

    const mapping = typeMap[rawType]
    if (!mapping) return

    // Reunir todas las transacciones de este grupo de anomalía
    const group: ParsedTransaction[] = [tx]
    processed.add(tx.id)

    if (tx.idTransaccionReferencia) {
      const partner = txMap.get(tx.idTransaccionReferencia)
      if (partner && partner.tipoAnomalia && !processed.has(partner.id)) {
        group.push(partner)
        processed.add(partner.id)
      }
    }

    // Ordenar por índice de generación para identificar original vs copia
    group.sort((a, b) => a.id.localeCompare(b.id))

    // Para COBRO_INCORRECTO: toda la transacción es recuperable
    if (rawType === 'COBRO_INCORRECTO') {
      const titleDesc = tx.motivoReclamo || `Cobro incorrecto: ${tx.description}`
      anomalies.push({
        type: mapping.type,
        severity: mapping.severity,
        title: titleDesc,
        description: tx.motivoReclamo || `Cobro incorrecto de $${Math.abs(tx.amount).toLocaleString('es-CL')} — ${tx.description}`,
        detail: `Fecha: ${tx.date} · Monto: $${Math.abs(tx.amount).toLocaleString('es-CL')} · Descripción: ${tx.description}${tx.motivoReclamo ? ` · Motivo: ${tx.motivoReclamo}` : ''}`,
        recoverableAmount: Math.abs(tx.amount),
        transactionRefs: [tx.id],
      })
      return
    }

    // Para COBRO_DOBLE / COBRO_ALTO_DUPLICADO: la(s) copia(s) son recuperables
    const extras = group.slice(1)
    if (extras.length === 0) {
      // Si no tiene par pero está marcado como duplicado, es recuperable completo
      anomalies.push({
        type: mapping.type,
        severity: mapping.severity,
        title: `Cobro duplicado: ${tx.description}`,
        description: tx.motivoReclamo || `Este cobro de $${Math.abs(tx.amount).toLocaleString('es-CL')} aparece duplicado en el estado de cuenta.`,
        detail: `Fecha: ${tx.date} · Monto: $${Math.abs(tx.amount).toLocaleString('es-CL')} · Descripción: ${tx.description}${tx.motivoReclamo ? ` · Motivo: ${tx.motivoReclamo}` : ''}`,
        recoverableAmount: Math.abs(tx.amount),
        transactionRefs: [tx.id],
      })
      return
    }

    const totalExtra = extras.reduce((sum, e) => sum + Math.abs(e.amount), 0)
    const descriptions = group.map(t => t.description).filter((d, i, a) => a.indexOf(d) === i)
    const titleDesc = tx.motivoReclamo || descriptions.join(', ')
    const fechas = group.map(t => t.date).join(', ')

    anomalies.push({
      type: mapping.type,
      severity: mapping.severity,
      title: `Cobro duplicado: ${titleDesc.substring(0, 60)}`,
      description: tx.motivoReclamo || `Se detectó un cobro duplicado de $${Math.abs(extras[0].amount).toLocaleString('es-CL')}. El cargo se realizó ${group.length} veces.`,
      detail: `Monto: $${Math.abs(extras[0].amount).toLocaleString('es-CL')} cada uno · Fechas: ${fechas} · Cobros: ${group.length} · Monto recuperable: $${totalExtra.toLocaleString('es-CL')}${tx.motivoReclamo ? `\nMotivo: ${tx.motivoReclamo}` : ''}`,
      recoverableAmount: totalExtra,
      transactionRefs: extras.map(e => e.id),
    })
  })

  return anomalies
}

function isAllowedStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  if (!url.startsWith(supabaseUrl + '/storage/v1/object/public/analysis-files/')) return false
  if (url.includes('..')) return false
  if (url.length > 2048) return false
  return true
}

export async function analyzeFile(
  filePath: string,
  fileType: string,
  options?: { userId?: string; companyId?: string; fileName?: string }
): Promise<AnalysisResult> {
  try {
    let buffer: Buffer
    
    if (filePath.startsWith('http')) {
      if (!isAllowedStorageUrl(filePath)) {
        throw new Error('URL de archivo no permitida')
      }
      const response = await fetch(filePath)
      if (!response.ok) throw new Error(`Error descargando archivo: ${response.statusText}`)
      const contentLength = Number(response.headers.get('content-length'))
      if (contentLength > 10 * 1024 * 1024) {
        throw new Error('Archivo excede el tamaño máximo de 10MB')
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      throw new Error('Solo se soportan URLs de Supabase Storage')
    }

    // Parsear según el tipo
    let transactions: ParsedTransaction[] = []

    if (fileType.includes('pdf')) {
      const { parsePDFFile } = await import('./parser')
      transactions = await parsePDFFile(buffer)
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || filePath.endsWith('.xlsx') || filePath.endsWith('.xls') || filePath.endsWith('.csv')) {
      const { parseExcelFile } = await import('./parser')
      transactions = await parseExcelFile(buffer as unknown as ArrayBuffer)
    } else {
      throw new Error(`Tipo de archivo no soportado: ${fileType}`)
    }

    // Detectar banco
    const bank = detectBank('', transactions.map(tx => tx.description).join(' '))

    // Ejecutar detección por reglas
    const ruleAnomalies = detectAnomaliesRules(transactions)

    // Detectar anomalías pre-etiquetadas en el CSV
    const labeledAnomalies = detectLabeledAnomalies(transactions)

    // Ejecutar análisis con IA
    const aiResult = await analyzeTransactionsWithAI(transactions, bank)

    // Combinar resultados (IA + reglas + etiquetadas)
    const allAnomalies = [...ruleAnomalies, ...labeledAnomalies, ...aiResult.anomalies]

    // Calcular período
    const dates = transactions.map(tx => tx.date).sort()
    const period = dates.length > 0 ? {
      start: dates[0],
      end: dates[dates.length - 1]
    } : undefined

    // Calcular monto total recuperable
    const totalRecoverable = allAnomalies.reduce((sum, a) => sum + a.recoverableAmount, 0)

    return {
      anomalies: allAnomalies,
      totalTransactions: transactions.length,
      totalRecoverable,
      period,
      bank,
      aiSummary: aiResult.summary,
      transactions,
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido en analyzeFile'
    console.error('Error en analyzeFile:', errorMsg)
    return {
      anomalies: [],
      totalTransactions: 0,
      totalRecoverable: 0,
      success: false,
      error: errorMsg,
    }
  }
}


