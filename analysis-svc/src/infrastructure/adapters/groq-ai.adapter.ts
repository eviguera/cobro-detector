import Groq from 'groq-sdk'
import type { AiProvider, AiResult } from '../../domain/ports/ai-provider.port.js'
import type { ParsedTransaction, DetectedAnomaly } from '../../domain/analysis-result.types.js'

function sanitizeTransactions(transactions: any[]): any[] {
  return transactions.map(tx => ({
    date: String(tx.date ?? '').slice(0, 20),
    description: String(tx.description ?? '').replace(/[<>&"']/g, '').slice(0, 200),
    amount: typeof tx.amount === 'number' ? tx.amount : 0,
    type: String(tx.type ?? '').slice(0, 20),
    balance: typeof tx.balance === 'number' ? tx.balance : undefined,
  }))
}

function sanitizeBankName(bank: string): string {
  return bank.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').slice(0, 50)
}

let groqInstance: Groq | null = null

function getGroq(): Groq {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqInstance
}

export async function analyzeTransactionsWithAI(
  transactions: ParsedTransaction[],
  bankName?: string
): Promise<{ anomalies: DetectedAnomaly[]; summary: string; degraded?: boolean }> {
  const groq = getGroq()
  if (!process.env.GROQ_API_KEY) {
    return { anomalies: [], summary: '', degraded: true }
  }

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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }, { signal: controller.signal })

    clearTimeout(timeoutId)

    const text = chatCompletion.choices[0]?.message?.content || ''
    const clean = text.replace(/```json\n?|```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    const anomalies = Array.isArray(parsed.anomalies)
      ? parsed.anomalies.filter((a: Record<string, unknown>) =>
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
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Groq API timeout después de 30s')
    } else {
      console.error('Error en analyzeTransactionsWithAI:', error instanceof Error ? error.message : String(error))
    }
    return { anomalies: [], summary: 'No se pudo completar el análisis automático.', degraded: true }
  }
}

export class GroqAiAdapter implements AiProvider {
  async analyze(transactions: ParsedTransaction[], bank: string): Promise<AiResult> {
    const result = await analyzeTransactionsWithAI(transactions, bank)
    return {
      anomalies: result.anomalies as unknown as Array<Record<string, unknown>>,
      summary: result.summary,
      degraded: result.degraded,
    }
  }
}
