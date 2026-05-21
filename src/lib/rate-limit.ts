import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Inicializar Redis solo si las variables están configuradas
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null

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

export interface RateLimitResult {
  success: boolean
  limit?: number
  remaining?: number
  reset?: number
}

// Rate limiting estricto para endpoints críticos (análisis, pagos)
export async function checkStrictRateLimit(ip: string): Promise<RateLimitResult> {
  const rl = getRateLimit()
  
  if (!rl) {
    return { success: true }
  }
  
  // 3 requests por minuto para endpoints críticos
  const strictRl = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(3, '60 s'),
  })
  
  const result = await strictRl.limit(`strict:${ip}`)
  
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
  const rl = getRateLimit()

  if (!rl) {
    return { success: true }
  }

  const authRl = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
  })

  const result = await authRl.limit(`auth:${ip}`)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}


