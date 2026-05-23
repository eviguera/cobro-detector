import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (origin && origin !== appUrl && origin !== 'https://cobrodetector.cl') {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }
  if (!origin && referer && !referer.startsWith(appUrl) && !referer.startsWith('https://cobrodetector.cl')) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', appUrl))
}
