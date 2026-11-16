import { NextResponse } from 'next/server'
import { readJsonBody, requireS3StorageUser } from '@/lib/api-storage-guard'
import { validateOwnedStoragePath } from '@/lib/storage-path'
import { getS3StoragePort } from '@/infrastructure/adapters/storage/s3-storage.adapter'

/**
 * Emite una URL prefirmada de PUT para que el navegador suba el archivo
 * cifrado directo a S3 (sin pasar por Vercel, que limita el body a 4.5 MB).
 *
 * El cliente construye la ruta con `buildStoragePath`; aquí se revalida que
 * caiga bajo el prefijo del usuario autenticado.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 10 minutos: suficiente para subir y corto para no dejar firmas colgando. */
const UPLOAD_URL_TTL_SECONDS = 600

export async function POST(request: Request) {
  const guard = await requireS3StorageUser()
  if (!guard.ok) return guard.response

  const body = await readJsonBody(request)
  if (!body) {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const validation = validateOwnedStoragePath(guard.userId, body.path)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const url = await getS3StoragePort().createSignedUploadUrl(
      validation.path,
      UPLOAD_URL_TTL_SECONDS,
    )
    return NextResponse.json({ url })
  } catch (error) {
    console.error('No se pudo firmar la subida a S3', error)
    return NextResponse.json({ error: 'No se pudo preparar la subida' }, { status: 500 })
  }
}
