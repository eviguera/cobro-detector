import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Solo permitimos rutas internas: evita open redirects vía ?next=https://evil.com */
function safeNextPath(next: string | null): string {
  if (!next) return '/dashboard'
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const next = safeNextPath(url.searchParams.get('next'))

  // Supabase puede devolver errores en el callback (link expirado, cancelado, etc.).
  const authError = url.searchParams.get('error_code') ?? url.searchParams.get('error')
  if (authError) {
    const target = new URL('/login', request.url)
    target.searchParams.set('error', authError)
    return NextResponse.redirect(target)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const target = new URL('/login', request.url)
    target.searchParams.set('error', 'auth_callback')
    return NextResponse.redirect(target)
  }

  // Recuperación de contraseña: el usuario ya tiene sesión temporal, lo llevamos
  // al formulario de "nueva contraseña" en vez del dashboard.
  if (type === 'recovery') {
    const target = new URL('/login', request.url)
    target.searchParams.set('reset', '1')
    return NextResponse.redirect(target)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
