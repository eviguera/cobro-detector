import type { ParsedTransaction } from '@/types/database.types'
import { sanitizeDescription } from '@/lib/security'

// Genera IDs únicos para transacciones
function generateId(index: number): string {
  return `tx-${index.toString().padStart(4, '0')}`
}

// Normaliza montos: soporta "1.234.567" y "1234567" y "-1.234"
function parseAmount(raw: string | number): number {
  if (typeof raw === 'number') return raw
  const cleaned = raw.toString()
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Normaliza fecha a YYYY-MM-DD
function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0]

  // DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // YYYY-MM-DD ya formateado
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]

  return raw
}

// Parser para archivos Excel/CSV usando xlsx
export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  // Importación dinámica para evitar problemas de SSR
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(sheet, { raw: false })

  return rows
    .filter(row => {
      // Filtra filas vacías o headers duplicados
      const values = Object.values(row)
      return values.some(v => v && v.toString().trim() !== '')
    })
    .map((row, i): ParsedTransaction => {
      // Detectar columnas de forma flexible (distintos bancos usan distintos nombres)
      const keys = Object.keys(row).map(k => k.toLowerCase())

      const dateKey = keys.find(k => k.includes('fecha') || k.includes('date')) ?? keys[0]
      const descKey = keys.find(k => k.includes('desc') || k.includes('glosa') || k.includes('concepto') || k.includes('detalle')) ?? keys[1]
      const amountKey = keys.find(k => k.includes('monto') || k.includes('importe') || k.includes('amount') || k.includes('valor')) ?? keys[2]
      const typeKey = keys.find(k => k.includes('tipo') || k.includes('type') || k.includes('mov'))

      const rawAmount = parseAmount(row[Object.keys(row)[keys.indexOf(amountKey)]] ?? 0)
      const rawDesc = String(row[Object.keys(row)[keys.indexOf(descKey)]] ?? '')
      const rawDate = String(row[Object.keys(row)[keys.indexOf(dateKey)]] ?? '')
      const rawType = typeKey ? String(row[Object.keys(row)[keys.indexOf(typeKey)]] ?? '') : ''

      // Determinar si es crédito o débito
      let amount = rawAmount
      let type: 'credit' | 'debit' = rawAmount >= 0 ? 'credit' : 'debit'
      if (rawType.toLowerCase().includes('cargo') || rawType.toLowerCase().includes('deb')) {
        type = 'debit'
        amount = -Math.abs(amount)
      } else if (rawType.toLowerCase().includes('abono') || rawType.toLowerCase().includes('cred')) {
        type = 'credit'
        amount = Math.abs(amount)
      }

      return {
        id: generateId(i),
        date: parseDate(rawDate),
        description: sanitizeDescription(rawDesc.trim()),
        amount,
        type,
      }
    })
    .filter(tx => tx.description && tx.amount !== 0)
}

// Parser simplificado para PDF (texto extraído)
export function parsePDFText(text: string): ParsedTransaction[] {
  const lines = text.split('\n').filter(l => l.trim())
  const transactions: ParsedTransaction[] = []
  let index = 0

  // Regex para detectar líneas con fecha + descripción + monto
  // Soporta: "01/03/2024  COMPRA SUPERMERCADO  -45.900"
  const lineRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\-\+]?[\d\.]+(?:,\d{2})?)\s*$/

  lines.forEach(line => {
    const match = line.match(lineRegex)
    if (match) {
      const [, rawDate, rawDesc, rawAmount] = match
      const amount = parseAmount(rawAmount)
      if (Math.abs(amount) < 1) return // ignora montos mínimos

      transactions.push({
        id: generateId(index++),
        date: parseDate(rawDate),
        description: sanitizeDescription(rawDesc.trim()),
        amount,
        type: amount >= 0 ? 'credit' : 'debit',
      })
    }
  })

  return transactions
}

// Detectar banco por nombre de archivo o contenido
export function detectBank(filename: string, content?: string): string | undefined {
  const lower = (filename + (content ?? '')).toLowerCase()
  if (lower.includes('santander')) return 'Banco Santander'
  if (lower.includes('bci')) return 'BCI'
  if (lower.includes('chile')) return 'Banco de Chile'
  if (lower.includes('estado')) return 'BancoEstado'
  if (lower.includes('itau') || lower.includes('itaú')) return 'Itaú'
  if (lower.includes('scotiabank') || lower.includes('scotia')) return 'Scotiabank'
  if (lower.includes('security')) return 'Banco Security'
  if (lower.includes('falabella')) return 'Banco Falabella'
  if (lower.includes('ripley')) return 'Banco Ripley'
  return undefined
}
