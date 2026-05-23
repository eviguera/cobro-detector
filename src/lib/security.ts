import crypto from 'crypto'

// ==========================================
// Sanitización de Datos (Anti Prompt Injection)
// ==========================================

/**
 * Escapa caracteres especiales XML para prevenir inyección
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Patrones maliciosos comunes en intentos de prompt injection
const INJECTION_PATTERNS = [
  /ignore.*previous.*instructions?/gi,
  /ignora.*instrucciones?/gi,
  /you are now|ahora eres|act as|actúa como/gi,
  /system:|usuario:|assistant:/gi,
  /```/g,
]

/**
 * Sanitiza un nombre de banco para prevenir prompt injection en LLM
 */
export function sanitizeBankName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑü\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50)
}

/**
 * Sanitiza una descripción para prevenir prompt injection
 * Remueve patrones maliciosos y limita longitud
 */
export function sanitizeDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  let cleaned = desc
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[FILTERED]')
  }
  return cleaned.substring(0, 200)
}

/**
 * Sanitiza un array de transacciones
 */
export function sanitizeTransactions<T extends { description: string | null | undefined }>(
  txs: T[]
): T[] {
  return txs.map(tx => ({
    ...tx,
    description: sanitizeDescription(tx.description),
  }))
}

// ==========================================
// Validación de Webhooks (MercadoPago)
// ==========================================

/**
 * Verifica la firma de un webhook de MercadoPago v2
 * Doc: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhook(
  body: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) return false
  
  try {
    const [algorithm, signatureHash] = signature.split('=')
    if (!algorithm || !signatureHash) return false
    
    const hmac = crypto.createHmac('sha256', webhookSecret)
    hmac.update(body)
    const expectedHash = hmac.digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )
  } catch {
    return false
  }
}


