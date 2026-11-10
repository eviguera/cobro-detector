import Groq from 'groq-sdk'
import type { AiProvider, AiResult } from '../../domain/ports/ai-provider.port.js'
import type { ParsedTransaction, DetectedAnomaly } from '../../domain/analysis-result.types.js'

function sanitizeTransactions(transactions: any[]): any[] {
  return transactions.map(tx => ({
    id: String(tx.id ?? '').slice(0, 64),
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

  const userPrompt = `Analiza estas transacciones de un estado de cuenta bancario${bankName ? ` del ${sanitizeBankName(bankName)}` : ''} y detecta SOLO lo que puedas respaldar con transacciones concretas:

1. **COMISIONES DE CRÉDITO REPETIDAS**: una comisión de crédito debe cobrarse una vez por operación. Si el mismo monto aparece varias veces en el mismo mes para el mismo comercio, sobra (N-1) cobros.
2. **INTERESES EN CUOTAS SIN INTERÉS**: una venta pactada "sin interés" no debe tener cargos por interés.
3. **COBROS DUPLICADOS**: mismo comercio y mismo monto cobrado dos veces en pocos días.
4. **CARGOS GENÉRICOS**: descripciones tipo "COM", "CARGO", "SERV" sin comercio identificable. Márcalos como severidad baja.

Reglas de precisión:
- NO marques ventas normales, compras con comercio identificable, mantención, seguros ni suscripciones como anomalía.
- El monto recuperable debe ser SOLO el cobro que sobra, no el total de la operación.
- Usa exclusivamente IDs que existan en <DATOS>.
- Si no hay evidencia suficiente, devuelve una lista vacía.

<DATOS>
${JSON.stringify(txSample, null, 2)}
</DATOS>

Responde SOLO JSON con esta estructura exacta:
{
  "anomalies": [
    {
      "type": "duplicate_commission",
      "severity": "high",
      "title": "Título breve y específico",
      "description": "Qué se cobró de más y por qué",
      "detail": "Fechas y montos concretos",
      "recoverableAmount": 12345,
      "transactionRefs": ["id1"]
    }
  ],
  "summary": "Resumen en 2-3 oraciones con el monto total y el hallazgo principal"
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
