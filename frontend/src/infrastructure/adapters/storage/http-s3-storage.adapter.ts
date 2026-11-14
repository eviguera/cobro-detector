import type { StoragePort, StorageUploadRequest } from '@/domain/ports/storage.port'

interface UrlResponse {
  url: string
}

async function readUrlResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${response.status}`)
  }
  const data = (await response.json()) as UrlResponse
  if (!data?.url) {
    throw new Error('El servidor no devolvió una URL de Storage')
  }
  return data.url
}

/**
 * Implementación de navegador para S3.
 *
 * Las credenciales AWS NUNCA llegan al navegador: se pide una URL prefirmada
 * a `/api/storage/*` (autenticada con la sesión de Supabase) y el navegador
 * habla directo con S3. Así los bytes no pasan por Vercel (límite 4.5 MB).
 *
 * Requiere que el bucket tenga CORS habilitado para el origen de la app.
 */
export class HttpS3StorageAdapter implements StoragePort {
  readonly driver = 's3' as const

  async upload({ path, data, contentType }: StorageUploadRequest): Promise<void> {
    const uploadUrl = await readUrlResponse(
      await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType }),
      }),
    )

    // La URL prefirmada no firma Content-Type: se enviarían bytes cifrados con
    // un MIME irrelevante, así que se omite la cabecera.
    const put = await fetch(uploadUrl, { method: 'PUT', body: data })
    if (!put.ok) {
      throw new Error(`Error al subir archivo a S3: HTTP ${put.status}`)
    }
  }

  async createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string> {
    return readUrlResponse(
      await fetch('/api/storage/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, ttlSeconds }),
      }),
    )
  }

  async remove(path: string): Promise<void> {
    const response = await fetch(`/api/storage/object?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? `HTTP ${response.status}`)
    }
  }
}
