import { NextRequest, NextResponse } from 'next/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'

const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

export async function POST(request: NextRequest) {
  const rawIp = request.ip ?? '127.0.0.1'
  const ip = ipRegex.test(rawIp) ? rawIp : '127.0.0.1'

  const result = await checkAuthRateLimit(ip)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un minuto.', retryAfter: 60 },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    )
  }

  return NextResponse.json({ allowed: true, remaining: result.remaining })
}
