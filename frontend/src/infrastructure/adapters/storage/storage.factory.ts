import type { StorageDriver, StoragePort } from '@/domain/ports/storage.port'
import { resolveClientStorageDriver } from './driver'
import { HttpS3StorageAdapter } from './http-s3-storage.adapter'
import { SupabaseStorageAdapter } from './supabase-storage.adapter'

/** Construye un adapter para el driver indicado (por defecto, el del entorno). */
export function createStoragePort(
  driver: StorageDriver = resolveClientStorageDriver(),
): StoragePort {
  return driver === 's3' ? new HttpS3StorageAdapter() : new SupabaseStorageAdapter()
}

let cached: StoragePort | null = null

/**
 * Instancia memoizada del puerto. El driver se fija en build-time
 * (`NEXT_PUBLIC_STORAGE_DRIVER`), así que no cambia durante la vida del bundle.
 */
export function getStoragePort(): StoragePort {
  if (!cached) {
    cached = createStoragePort()
  }
  return cached
}

/** Solo para tests: descarta la instancia memoizada. */
export function resetStoragePortForTests(): void {
  cached = null
}
