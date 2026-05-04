import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'
import { authError, handleApiError, successResponse } from '@/lib/api-error'

const createKeySchema = z.object({
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
  expires_in_days: z.number().min(1).max(365).optional(), // undefined = nunca expira
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return handleApiError(error, 'GET /api/integrations/api-keys')
    }

    return successResponse({ apiKeys })

  } catch (err) {
    return handleApiError(err, 'GET /api/integrations/api-keys')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
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

    const { data: apiKey, error } = await supabase
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
      return handleApiError(error, 'POST /api/integrations/api-keys - create')
    }

    // Retornar la key completa solo una vez (luego solo se ve el prefix)
    return successResponse({
      message: 'API key creada. Guárdala en un lugar seguro, no se mostrará nuevamente.',
      apiKey: {
        ...apiKey,
        full_key: rawKey, // Solo se retorna en la creación
      }
    })

  } catch (err) {
    return handleApiError(err, 'POST /api/integrations/api-keys')
  }
}
