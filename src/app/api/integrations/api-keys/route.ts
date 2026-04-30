import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const createKeySchema = z.object({
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
  expires_in_days: z.number().min(1).max(365).optional(), // undefined = nunca expira
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: apiKeys, error } = await (supabase as any)
      .from('api_keys')
      .select('id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error obteniendo API keys' }, { status: 500 })
    }

    return NextResponse.json({ apiKeys })

  } catch (err) {
    console.error('Error en GET /api/integrations/api-keys:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createKeySchema.parse(body)

    // Generar API key única
    const rawKey = `cd_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 11) // "cd_abc123..."

    const expiresAt = validated.expires_in_days
      ? new Date(Date.now() + validated.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data: apiKey, error } = await (supabase as any)
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: validated.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: validated.permissions,
        expires_at: expiresAt,
      })
      .select('id, name, key_prefix, permissions, is_active, expires_at, created_at')
      .single()

    if (error) {
      console.error('Error creando API key:', error)
      return NextResponse.json({ error: 'Error creando API key' }, { status: 500 })
    }

    // Retornar la key completa solo una vez (luego solo se ve el prefix)
    return NextResponse.json({
      message: 'API key creada. Guárdala en un lugar seguro, no se mostrará nuevamente.',
      apiKey: {
        ...apiKey,
        full_key: rawKey, // Solo se retorna en la creación
      }
    })

  } catch (err) {
    console.error('Error en POST /api/integrations/api-keys:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
