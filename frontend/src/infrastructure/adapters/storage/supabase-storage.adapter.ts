import { createClient } from '@/lib/supabase/client'
import type { StoragePort, StorageUploadRequest } from '@/domain/ports/storage.port'

const BUCKET = 'analysis-files'

/**
 * Implementación sobre Supabase Storage. Usa el cliente de navegador: la RLS
 * del bucket exige que el prefijo de la ruta sea el uid del usuario
 * autenticado, igual que antes de introducir el puerto.
 */
export class SupabaseStorageAdapter implements StoragePort {
  readonly driver = 'supabase' as const

  async upload({ path, data, contentType }: StorageUploadRequest): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    })

    if (error) {
      throw new Error(`Error al subir archivo: ${error.message || 'desconocido'}`)
    }
  }

  async createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds)

    if (error || !data?.signedUrl) {
      throw new Error(`Error al generar URL firmada: ${error?.message || 'desconocido'}`)
    }

    return data.signedUrl
  }

  async remove(path: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])

    if (error) {
      throw new Error(`Error al eliminar archivo: ${error.message || 'desconocido'}`)
    }
  }
}
