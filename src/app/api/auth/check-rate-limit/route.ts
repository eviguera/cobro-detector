import { NextRequest, NextResponse } from 'next/server'
import { checkAuthRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1'

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
