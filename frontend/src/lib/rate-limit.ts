import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Inicializar Redis solo si las variables están configuradas
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null
let strictRatelimit: Ratelimit | null = null
let authRatelimit: Ratelimit | null = null

function getRateLimit() {
  if (ratelimit) return ratelimit
  
  const redisUrl = process.env.UPSTASH_REDIS_URL
  const redisToken = process.env.UPSTASH_REDIS_TOKEN
  
  if (!redisUrl || !redisToken) {
    console.warn('⚠️ Rate limiting disabled: UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured')
    return null
  }
  
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  })
  
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests por 10 segundos
  })
  
  return ratelimit
}

function getStrictRateLimit(): Ratelimit | null {
  getRateLimit()
  if (!redis) return null
  if (strictRatelimit) return strictRatelimit
  strictRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '60 s'),
  })
  return strictRatelimit
}

function getAuthRateLimit(): Ratelimit | null {
  getRateLimit()
  if (!redis) return null
  if (authRatelimit) return authRatelimit
  authRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
  })
  return authRatelimit
}

function sanitizeIp(ip: string): string {
  const cleaned = ip.trim()
  if (cleaned.length > 45) return '127.0.0.1'
  const ipv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
  const ipv6 = /^[0-9a-fA-F:]+$/
  if (ipv4.test(cleaned) || ipv6.test(cleaned)) return cleaned
  return '127.0.0.1'
}

export interface RateLimitResult {
  success: boolean
  limit?: number
  remaining?: number
  reset?: number
}

// Rate limiting estricto para endpoints críticos (análisis, pagos)
export async function checkStrictRateLimit(ip: string, keyPrefix = 'strict'): Promise<RateLimitResult> {
  const rl = getStrictRateLimit()
  
  if (!rl) {
    return { success: true }
  }
  
  const safeIp = sanitizeIp(ip)
  const result = await rl.limit(`${keyPrefix}:${safeIp}`)
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// Rate limiting para intentos de auth (login/register)
// 5 intentos por minuto por IP — previene fuerza bruta
export async function checkAuthRateLimit(ip: string): Promise<RateLimitResult> {
  const rl = getAuthRateLimit()

  if (!rl) {
    return { success: true }
  }

  const safeIp = sanitizeIp(ip)
  const result = await rl.limit(`auth:${safeIp}`)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}


