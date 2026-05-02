import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health check endpoint for monitoring
 * Returns status of critical services
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {
    database: { ok: false },
    timestamp: { ok: true, message: new Date().toISOString() }
  }

  // Check Supabase connection
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.database = { 
      ok: !error, 
      message: error ? error.message : 'Connected' 
    }
  } catch (err) {
    checks.database = { 
      ok: false, 
      message: err instanceof Error ? err.message : 'Unknown error' 
    }
  }

  const allOk = Object.values(checks).every(c => c.ok)
  
  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    checks
  }, { 
    status: allOk ? 200 : 503 
  })
}
