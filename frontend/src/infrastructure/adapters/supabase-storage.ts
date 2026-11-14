import { createClient } from '@/lib/supabase/client'
import {
  encryptFileAES256GCM,
  exportKeyRaw,
  generateFileEncryptionKey,
  toBase64,
} from '@/lib/encryption'
import { buildStoragePath } from '@/domain/ports/storage.port'
import { getStoragePort } from './storage/storage.factory'

export interface UploadResult {
  storagePath: string
  signedUrl: string
  ivBase64: string
  /** Clave del archivo para el worker: envuelta por el servidor (KEK) si está
   * configurado, o base64 en texto plano en modo legado. */
  encryptionKeyBase64: string
}

async function wrapKeyOnServer(rawKeyBase64: string): Promise<string> {
  const response = await fetch('/api/storage/wrap-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: rawKeyBase64 }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Error al proteger la clave de cifrado (HTTP ${response.status})`)
  }
  const data = (await response.json()) as { wrappedKey?: string }
  if (!data?.wrappedKey) {
    throw new Error('El servidor no devolvió la clave protegida')
  }
  return data.wrappedKey
}

/**
 * El bucket `analysis-files` de Supabase tiene una allowlist de MIME types. El
 * contenido se cifra antes de subir, pero Supabase igual valida el
 * `contentType`: hay que declarar el tipo original del archivo, no
 * `application/octet-stream`.
 */
function resolveUploadContentType(file: File): string {
  const allowed = [
    'text/csv',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  if (allowed.includes(file.type)) return file.type

  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'text/csv'
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (name.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  return 'application/pdf'
}

/**
 * TTL de la URL firmada que consume analysis-svc. Debe sobrevivir la ventana de
 * reintentos del worker (3 intentos × 10 min de visibilidad): 1 hora.
 */
function resolveSignedUrlTtl(): number {
  const raw = Number(process.env.NEXT_PUBLIC_STORAGE_URL_TTL_SECONDS)
  return Number.isFinite(raw) && raw > 0 ? raw : 3600
}

/**
 * Cifra el archivo con AES-256-GCM ANTES de subirlo al backend de Storage.
 * Devuelve la ruta de almacenamiento, URL firmada, IV y clave de cifrado
 * (ambos en base64 para poder pasarse al backend).
 *
 * El backend concreto (Supabase Storage o S3) se elige con
 * `NEXT_PUBLIC_STORAGE_DRIVER`; el cifrado es idéntico en ambos casos.
 */
export async function uploadFileToStorage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const storage = getStoragePort()
  const storagePath = buildStoragePath(userId, file.name)

  // Generar clave efímera y cifrar antes de subir
  const key = await generateFileEncryptionKey()
  const { encrypted, iv } = await encryptFileAES256GCM(file, key)

  await storage.upload({
    path: storagePath,
    data: encrypted,
    contentType: resolveUploadContentType(file),
  })

  const signedUrl = await storage.createSignedDownloadUrl(storagePath, resolveSignedUrlTtl())
  const keyRaw = await exportKeyRaw(key)
  // Se envuelve con la KEK del servidor antes de persistirla: la BD no guarda
  // la clave en texto plano (a menos que el servidor esté en modo legado sin KEK).
  const wrappedKey = await wrapKeyOnServer(toBase64(keyRaw))

  return {
    storagePath,
    signedUrl,
    ivBase64: toBase64(iv),
    encryptionKeyBase64: wrappedKey,
  }
}

/**
 * Crea un registro de análisis con metadatos de cifrado y ruta de Storage.
 */
export async function createAnalysisRecord(
  userId: string,
  fileName: string,
  fileType: string,
  fileUrl: string,
  isPlatino: boolean,
  storagePath?: string | null,
  encryptionKeyIv?: string | null,
  encryptionKeyBase64?: string | null,
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_type: fileType,
      file_url: fileUrl,
      storage_path: storagePath ?? null,
      // El cliente declara en qué backend subió el archivo: `storage_path` tiene
      // la misma forma en Supabase y en S3, así que la ruta no lo distingue.
      storage_driver: getStoragePort().driver,
      encryption_key_iv: encryptionKeyIv ?? null,
      encryption_key_base64: encryptionKeyBase64 ?? null,
      // El cliente declara el PLAN, no el estado: `status` lo escribe el worker
      // con service role (el grant de UPDATE por columna está revocado).
      plan: isPlatino ? 'platino' : 'credits',
    })
    // Solo se pide `id`: el resto de columnas no son legibles por el cliente
    // (grants por columna) y pedir la fila completa devolvería 403.
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Error al crear análisis')
  }

  return data.id
}

/**
 * Elimina el registro de análisis Y el archivo de Storage asociado.
 * Requiere que el registro tenga la columna storage_path.
 */
export async function deleteAnalysisRecord(
  analysisId: string,
  storagePath?: string | null,
): Promise<void> {
  const supabase = createClient()

  // El borrado del objeto es best-effort: si falla, igual eliminamos el
  // registro (el archivo huérfano lo recoge la regla de lifecycle del bucket).
  if (storagePath) {
    try {
      await getStoragePort().remove(storagePath)
    } catch (removeError) {
      console.error('No se pudo eliminar el archivo de Storage', { analysisId, removeError })
    }
  }

  await supabase.from('analyses').delete().eq('id', analysisId)
}

/**
 * Evita que un análisis quede "procesando" para siempre si el servicio no
 * responde. Usa la RPC `mark_analysis_failed`, que valida dueño con
 * auth.uid() y no pisa un análisis completado: el UPDATE directo está
 * revocado a `authenticated` desde la migración de paywall.
 */
export async function markAnalysisFailed(analysisId: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('mark_analysis_failed', {
    p_analysis_id: analysisId,
  })

  // PostgREST resuelve con {error} en vez de lanzar: si no se revisa, el
  // .catch() del caller nunca se entera y el análisis queda "processing".
  if (error) {
    console.error('markAnalysisFailed falló', { analysisId, error: error.message })
    return
  }
  if (data !== true) {
    console.warn('markAnalysisFailed no actualizó (no existe, no es del usuario o ya está completado)', { analysisId })
  }
}
