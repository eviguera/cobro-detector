import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveServerStorageDriver } from '@/infrastructure/adapters/storage/driver'

export type StorageRouteGuard =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

/**
 * Guard común de `/api/storage/*`:
 *   1. exige sesión Supabase (cookie),
 *   2. exige que el driver activo sea `s3` (las rutas solo existen para S3;
 *      Supabase Storage se firma directo desde el navegador).
 *
 * Se autentica antes de responder por el driver para no revelar configuración
 * a peticiones anónimas.
 */
export async function requireS3StorageUser(): Promise<StorageRouteGuard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  if (resolveServerStorageDriver() !== 's3') {
    // 404: la ruta no aplica para el driver activo.
    return { ok: false, response: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) }
  }

  return { ok: true, userId: user.id }
}

/** Lee un body JSON sin lanzar (body vacío o inválido → `null`). */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json()
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
