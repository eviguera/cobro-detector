import type { ParsedTransaction } from '@/types/database.types'
import { sanitizeDescription } from '@/lib/security'
import { BANKS } from './constants'

// Genera IDs únicos para transacciones
function generateId(index: number): string {
  return `tx-${Date.now().toString(36)}-${index.toString().padStart(4, '0')}`
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
  if (!raw) return today()

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

  // M/D/YY o M/D/YYYY (formato que algunas herramientas exportan)
  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (usDate) {
    const [, m, d, y] = usDate
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return today()
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Convierte serial date de Excel a YYYY-MM-DD
function excelDateToString(date: Date): string {
  try {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return today()
  }
}

// Parser para archivos Excel/CSV
export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const MAX_BUFFER_SIZE = 10 * 1024 * 1024
  if (buffer.byteLength > MAX_BUFFER_SIZE) {
    throw new Error(`Archivo demasiado grande. Máximo ${MAX_BUFFER_SIZE / 1024 / 1024}MB.`)
  }

  // Detectar si es CSV puro (no ZIP/OLE2) para evitar auto-conversión de fechas
  const uint8 = new Uint8Array(buffer.slice(0, 4))
  const isXLSX = uint8[0] === 0x50 && uint8[1] === 0x4B
  const isXLS = uint8[0] === 0xD0 && uint8[1] === 0xCF
  const isCSV = !isXLSX && !isXLS

  if (isCSV) {
    return parseCSVBuffer(buffer)
  }

  if (isXLS) {
    throw new Error('Formato .xls no soportado. Guarda el archivo como .xlsx o CSV.')
  }

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(buffer))

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const rows: Record<string, string | number>[] = []
  const headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value ?? ''))
      })
      return
    }

    const rowData: Record<string, string | number> = {}
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1] ?? `col_${colNumber}`
      const val = cell.value
      if (val instanceof Date) {
        rowData[header] = excelDateToString(val)
      } else if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
        rowData[header] = val
      } else {
        rowData[header] = String(val ?? '')
      }
    })
    rows.push(rowData)
  })

  return rows
    .filter(row => {
      const values = Object.values(row)
      return values.some(v => v && v.toString().trim() !== '')
    })
    .map((row, i): ParsedTransaction => {
      const keys = Object.keys(row).map(k => k.toLowerCase())

      const dateKey = keys.find(k => k.includes('fecha') || k.includes('date')) ?? keys[0]
      const descKey = keys.find(k => k.includes('desc') || k.includes('glosa') || k.includes('concepto') || k.includes('detalle')) ?? keys[1]
      const amountKey = keys.find(k => k.includes('monto') || k.includes('importe') || k.includes('amount') || k.includes('valor')) ?? keys[2]
      const typeKey = keys.find(k => k.includes('tipo') || k.includes('type') || k.includes('mov'))

      const anomaliaKey = keys.find(k => k.includes('tipo_anomalia') || k.includes('tipo anomalia') || k.includes('anomalia'))
      const referenciaKey = keys.find(k => k.includes('id_transaccion_referencia') || k.includes('id transaccion referencia') || k.includes('id_transaccion_ref') || k.includes('referencia'))
      const reclamableKey = keys.find(k => k.includes('reclamable'))
      const motivoKey = keys.find(k => k.includes('motivo_reclamo') || k.includes('motivo reclamo') || k.includes('motivo'))

      const rawAmount = parseAmount(row[Object.keys(row)[keys.indexOf(amountKey)]] ?? 0)
      const rawDesc = String(row[Object.keys(row)[keys.indexOf(descKey)]] ?? '')
      const rawDate = String(row[Object.keys(row)[keys.indexOf(dateKey)]] ?? '')
      const rawType = typeKey ? String(row[Object.keys(row)[keys.indexOf(typeKey)]] ?? '') : ''

      let amount = rawAmount
      let type: 'credit' | 'debit' = rawAmount >= 0 ? 'credit' : 'debit'
      if (rawType.toLowerCase().includes('cargo') || rawType.toLowerCase().includes('deb')) {
        type = 'debit'
        amount = -Math.abs(amount)
      } else if (rawType.toLowerCase().includes('abono') || rawType.toLowerCase().includes('cred')) {
        type = 'credit'
        amount = Math.abs(amount)
      }

      const tx: ParsedTransaction = {
        id: generateId(i),
        date: parseDate(rawDate),
        description: sanitizeDescription(rawDesc.trim()),
        amount,
        type,
      }

      if (anomaliaKey) {
        tx.tipoAnomalia = String(row[Object.keys(row)[keys.indexOf(anomaliaKey)]] ?? '').trim().toUpperCase()
      }
      if (referenciaKey) {
        tx.idTransaccionReferencia = String(row[Object.keys(row)[keys.indexOf(referenciaKey)]] ?? '').trim()
      }
      if (reclamableKey) {
        const raw = String(row[Object.keys(row)[keys.indexOf(reclamableKey)]] ?? '').trim().toUpperCase()
        tx.reclamable = raw === 'SI' || raw === 'S' || raw === 'YES' || raw === 'TRUE'
      }
      if (motivoKey) {
        tx.motivoReclamo = String(row[Object.keys(row)[keys.indexOf(motivoKey)]] ?? '').trim()
      }

      return tx
    })
    .filter(tx => tx.description && tx.amount !== 0)
}

function parseCSVBuffer(buffer: ArrayBuffer): ParsedTransaction[] {
  const text = new TextDecoder('utf-8').decode(buffer)
  // Eliminar BOM (Byte Order Mark) si existe
  const cleanText = text.replace(/^\ufeff/, '')
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const rawHeaders = parseCSVLine(lines[0])
  const headerKeys = rawHeaders.map(h => h.toLowerCase().trim())

  const dateKey = headerKeys.findIndex(k => k.includes('fecha') || k.includes('date'))
  const descKey = headerKeys.findIndex(k => k.includes('desc') || k.includes('glosa') || k.includes('concepto') || k.includes('detalle'))
  const amountKey = headerKeys.findIndex(k => k.includes('monto') || k.includes('importe') || k.includes('amount') || k.includes('valor'))
  const typeKey = headerKeys.findIndex(k => k.includes('tipo') || k.includes('type') || k.includes('mov'))

  // Columnas de anomalías pre-etiquetadas
  const anomaliaKey = headerKeys.findIndex(k =>
    k.includes('tipo_anomalia') || k.includes('tipo anomalia') || k.includes('anomalia')
  )
  const referenciaKey = headerKeys.findIndex(k =>
    k.includes('id_transaccion_referencia') || k.includes('id transaccion referencia') || k.includes('id_transaccion_ref') || k.includes('referencia')
  )
  const reclamableKey = headerKeys.findIndex(k => k.includes('reclamable'))
  const motivoKey = headerKeys.findIndex(k =>
    k.includes('motivo_reclamo') || k.includes('motivo reclamo') || k.includes('motivo')
  )
  const idOriginalKey = headerKeys.findIndex(k =>
    k === 'id_transaccion' || k === 'id' || k.includes('id transaccion')
  )

  // Primera pasada: generar todas las transacciones y construir el mapa ID original → ID generado
  const rows = lines.slice(1).map(line => parseCSVLine(line))
  const originalToGenerated: Record<string, string> = {}

  rows.forEach((values, i) => {
    if (idOriginalKey >= 0) {
      const originalId = (values[idOriginalKey] ?? '').trim()
      if (originalId) {
        originalToGenerated[originalId] = generateId(i)
      }
    }
  })

  return rows
    .map((values, i) => {
      const rawDate = values[dateKey >= 0 ? dateKey : 0] ?? ''
      const rawDesc = values[descKey >= 0 ? descKey : 1] ?? ''
      const rawAmount = values[amountKey >= 0 ? amountKey : 2] ?? ''
      const rawType = typeKey >= 0 ? (values[typeKey] ?? '') : ''

      const amount = parseAmount(rawAmount)
      let type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit'
      if (rawType.toLowerCase().includes('cargo') || rawType.toLowerCase().includes('deb')) {
        type = 'debit'
      } else if (rawType.toLowerCase().includes('abono') || rawType.toLowerCase().includes('cred')) {
        type = 'credit'
      }

      const tx: ParsedTransaction = {
        id: generateId(i),
        date: parseDate(rawDate.trim()),
        description: sanitizeDescription(rawDesc.trim()),
        amount,
        type,
      }

      // Leer columnas de anomalías si existen
      if (anomaliaKey >= 0) {
        tx.tipoAnomalia = (values[anomaliaKey] ?? '').trim().toUpperCase()
      }
      if (referenciaKey >= 0) {
        const rawRef = (values[referenciaKey] ?? '').trim()
        // Resolver referencia: si el CSV usa IDs originales, traducir al ID generado
        tx.idTransaccionReferencia = originalToGenerated[rawRef] ?? rawRef
      }
      if (reclamableKey >= 0) {
        const raw = (values[reclamableKey] ?? '').trim().toUpperCase()
        tx.reclamable = raw === 'SI' || raw === 'S' || raw === 'YES' || raw === 'TRUE'
      }
      if (motivoKey >= 0) {
        tx.motivoReclamo = (values[motivoKey] ?? '').trim()
      }

      return tx
    })
    .filter(tx => tx.description && tx.amount !== 0)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// Parser para archivos PDF usando pdf-parse
export async function parsePDFFile(buffer: Buffer): Promise<ParsedTransaction[]> {
  const MAX_BUFFER_SIZE = 10 * 1024 * 1024
  if (buffer.byteLength > MAX_BUFFER_SIZE) {
    throw new Error(`Archivo demasiado grande. Máximo ${MAX_BUFFER_SIZE / 1024 / 1024}MB.`)
  }
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return parsePDFText(data.text)
}

function parsePDFText(text: string): ParsedTransaction[] {
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
  for (const [keyword, name] of Object.entries(BANKS)) {
    if (lower.includes(keyword)) return name
  }
  return undefined
}
