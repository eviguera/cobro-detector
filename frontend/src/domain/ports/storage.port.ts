/**
 * Puerto de almacenamiento de archivos de análisis.
 *
 * Dos implementaciones detrás del mismo contrato:
 *   - `supabase`: bucket `analysis-files` (driver por defecto, producción).
 *   - `s3`: bucket S3/R2/MinIO mediante URLs prefirmadas.
 *
 * El contenido SIEMPRE llega cifrado (AES-256-GCM) desde
 * `uploadFileToStorage`; los adapters solo mueven bytes y firman URLs.
 */

export type StorageDriver = 'supabase' | 's3'

export interface StorageUploadRequest {
  /** Ruta relativa dentro del bucket, p. ej. `${userId}/${ts}-file.csv.enc`. */
  path: string
  /** Bytes cifrados del archivo. */
  data: ArrayBuffer
  /**
   * MIME del archivo ORIGINAL. Supabase lo valida contra la allowlist del
   * bucket; S3 no lo usa (los objetos están cifrados y la presigned PUT no
   * firma Content-Type).
   */
  contentType: string
}

export interface StoragePort {
  readonly driver: StorageDriver

  /** Sube los bytes cifrados a la ruta indicada. Lanza si falla. */
  upload(request: StorageUploadRequest): Promise<void>

  /** Devuelve una URL firmada de descarga válida `ttlSeconds` segundos. */
  createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string>

  /** Elimina el objeto. Lanza si falla. */
  remove(path: string): Promise<void>
}

/** Cualquier carácter fuera de [a-zA-Z0-9._-] se reemplaza por `_`. */
const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]/g

/**
 * Normaliza el nombre original del archivo para usarlo como parte de la ruta
 * de Storage. Evita `../`, espacios y caracteres que rompen URLs.
 */
export function sanitizeFileName(fileName: string): string {
  const safe = fileName.replace(UNSAFE_FILENAME_CHARS, '_')
  return safe.length > 0 ? safe : 'archivo'
}

/**
 * Convención única de rutas: `${userId}/${Date.now()}-${safeName}.enc`.
 *
 * El prefijo `${userId}/` es lo que valida el servidor (`/api/storage/*`) para
 * impedir que un usuario firme o borre objetos de otro.
 */
export function buildStoragePath(
  userId: string,
  fileName: string,
  now: number = Date.now(),
): string {
  return `${userId}/${now}-${sanitizeFileName(fileName)}.enc`
}
