import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host') ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const allowedHosts = [appUrl, 'https://cobrodetector.cl']

  const isAllowed = (url: string | null) => {
    if (!url) return false
    return allowedHosts.some(h => url.startsWith(h) || url.startsWith(h.replace('https://', 'http://')))
      || (host && url.includes(host))
  }

  if (origin && !isAllowed(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }
  if (!origin && referer && !isAllowed(referer)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', appUrl))
}
