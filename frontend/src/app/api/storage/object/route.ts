import { NextResponse } from 'next/server'
import { requireS3StorageUser } from '@/lib/api-storage-guard'
import { validateOwnedStoragePath } from '@/lib/storage-path'
import { getS3StoragePort } from '@/infrastructure/adapters/storage/s3-storage.adapter'

/**
 * Elimina un objeto del bucket S3 del propio usuario (borrado de un análisis).
 *
 * `DeleteObject` es idempotente en S3: borrar dos veces no es un error.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  const guard = await requireS3StorageUser()
  if (!guard.ok) return guard.response

  const url = new URL(request.url)
  const validation = validateOwnedStoragePath(guard.userId, url.searchParams.get('path'))
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    await getS3StoragePort().remove(validation.path)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('No se pudo eliminar el objeto de S3', error)
    return NextResponse.json({ error: 'No se pudo eliminar el archivo' }, { status: 500 })
  }
}
