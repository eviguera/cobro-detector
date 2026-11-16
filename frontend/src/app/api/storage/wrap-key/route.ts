import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { wrapDataKey } from '@/lib/server/key-wrap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  key: z.string().min(1),
})

/**
 * Envuelve la clave AES-256-GCM del archivo con la KEK del servidor para que la
 * base de datos no almacene la clave en texto plano. Requiere sesión válida.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    // Valida que sea una clave raw de 32 bytes en base64
    const keyBytes = Buffer.from(parsed.data.key, 'base64')
    if (keyBytes.length !== 32) {
      return NextResponse.json(
        { error: 'La clave debe ser de 32 bytes en base64' },
        { status: 400 },
      )
    }

    const wrappedKey = wrapDataKey(parsed.data.key)
    return NextResponse.json({ wrappedKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo envolver la clave'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
