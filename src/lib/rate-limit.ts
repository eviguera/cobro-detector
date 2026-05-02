import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================
// Rate Limiting Real para Vercel (Upstash Redis)
// ============================================

let redis: Redis | null = null
let rateLimiter: Ratelimit | null = null

function getRedisClient(): Redis | null {
  if (redis) return redis
  
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN
  
  if (!url || !token) {
    console.warn('⚠️ Upstash Redis no configurado. Rate limiting desactivado.')
    return null
  }
  
  redis = new Redis({ url, token })
  return redis
}

function getRateLimiter(): Ratelimit | null {
  if (rateLimiter) return rateLimiter
  
  const client = getRedisClient()
  if (!client) return null
  
  rateLimiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests por hora por usuario
    analytics: true,
    prefix: 'cobrodetector_ratelimit',
  })
  
  return rateLimiter
}

/**
 * Verifica si un usuario/identificador ha excedido el rate limit
 * @param identifier - ID de usuario, IP, o API key
 * @param limit - Límite personalizado (opcional)
 * @param window - Ventana personalizada en segundos (opcional)
 * @returns { allowed: boolean, remaining: number, reset: number }
 */
export async function checkRateLimit(
  identifier: string,
  limit?: number,
  window?: number
): Promise<{ allowed: boolean; remaining: number; reset: number; retryAfter?: number }> {
  const limiter = getRateLimiter()
  
  // Si no hay Redis configurado, permitir todo (desarrollo)
  if (!limiter) {
    return { allowed: true, remaining: 999, reset: 0 }
  }
  
  try {
    const result = await limiter.limit(identifier)
    
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (err) {
    console.error('Rate limit error:', err)
    // En caso de error, permitir (fail open)
    return { allowed: true, remaining: 0, reset: 0 }
  }
}

/**
 * Rate limit específico para análisis (10 por hora)
 */
export async function checkAnalyzeRateLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  reset: number
  retryAfter?: number
}> {
  return checkRateLimit(`analyze:${userId}`, 10, 3600)
}

/**
 * Rate limit específico para API keys (1000 por hora)
 */
export async function checkApiKeyRateLimit(apiKeyId: string): Promise<{
  allowed: boolean
  remaining: number
  reset: number
  retryAfter?: number
}> {
  return checkRateLimit(`api:${apiKeyId}`, 1000, 3600)
}

/**
 * Rate limit por IP para endpoints públicos (5 por minuto)
 */
export async function checkIPRateLimit(ip: string): Promise<{
  allowed: boolean
  remaining: number
  reset: number
  retryAfter?: number
}> {
  return checkRateLimit(`ip:${ip}`, 5, 60)
}
