import { NextResponse } from 'next/server'
import { readJsonBody, requireS3StorageUser } from '@/lib/api-storage-guard'
import { clampSignedUrlTtl, validateOwnedStoragePath } from '@/lib/storage-path'
import { getS3StoragePort } from '@/infrastructure/adapters/storage/s3-storage.adapter'

/**
 * Emite una URL prefirmada de GET para un objeto del propio usuario.
 *
 * La URL la consume analysis-svc para descargar el archivo cifrado, así que el
 * TTL debe cubrir la ventana de reintentos del worker (máx. 3 × 10 min).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_DOWNLOAD_TTL_SECONDS = 3600

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

  const ttlSeconds = clampSignedUrlTtl(body.ttlSeconds, DEFAULT_DOWNLOAD_TTL_SECONDS)

  try {
    const url = await getS3StoragePort().createSignedDownloadUrl(validation.path, ttlSeconds)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('No se pudo firmar la descarga de S3', error)
    return NextResponse.json({ error: 'No se pudo generar la URL de descarga' }, { status: 500 })
  }
}
