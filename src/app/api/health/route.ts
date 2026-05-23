import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkStrictRateLimit } from '@/lib/rate-limit'

/**
 * Health check endpoint for monitoring
 * Returns status of critical services
 */
export async function GET(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const rateCheck = await checkStrictRateLimit(ip)
  if (!rateCheck.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const checks: Record<string, { ok: boolean }> = {
    database: { ok: false },
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.database = { ok: !error }

    if (error) {
      console.error('Health check: database error', error.code)
    }
  } catch (err) {
    checks.database = { ok: false }
    console.error('Health check: database exception', err instanceof Error ? err.message : err)
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, {
    status: allOk ? 200 : 503,
  })
}
