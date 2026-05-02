import crypto from 'crypto'

// ============================================
// Sanitización de Datos (Anti Prompt Injection)
// ============================================

// Patrones maliciosos comunes en intentos de prompt injection
const INJECTION_PATTERNS = [
  /ignore.*previous.*instructions?/gi,
  /ignora.*instrucciones?/gi,
  /you are now|ahora eres|act as|actúa como/gi,
  /system:|usuario:|assistant:/gi,
  /```/g,
]

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

// ============================================
// API Key Hashing (SHA-256 Consistente)
// ============================================

/**
 * Genera un hash SHA-256 para API keys
 * Usar este en lugar de bcrypt/md5 para consistencia
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Verifica si una API key coincide con su hash
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const hash = hashApiKey(rawKey)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))
}

// ============================================
// Validación de Webhooks (MercadoPago)
// ============================================

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

// ============================================
// Validación de Variables de Entorno
// ============================================

import { z } from 'zod'

const envSchema = z.object({
  GOOGLE_GEMINI_API_KEY: z.string().min(1).optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_PUBLIC_KEY: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

/**
 * Valida las variables de entorno al iniciar la app
 * Lanza error si faltan variables requeridas
 */
export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ')
    throw new Error(`❌ Variables de entorno inválidas:\n  ${missing}`)
  }

  cachedEnv = parsed.data
  return cachedEnv
}

// Extender el schema con la variable del webhook secret
const fullEnvSchema = envSchema.extend({
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
})

export function validateFullEnv(): Env & { MERCADOPAGO_WEBHOOK_SECRET?: string } {
  const parsed = fullEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ')
    throw new Error(`❌ Variables de entorno inválidas:\n  ${missing}`)
  }
  return parsed.data as any
}
