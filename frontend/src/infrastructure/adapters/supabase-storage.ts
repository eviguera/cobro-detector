import { createClient } from '@/lib/supabase/client'
import {
  encryptFileAES256GCM,
  exportKeyRaw,
  generateFileEncryptionKey,
  toBase64,
} from '@/lib/encryption'

export interface UploadResult {
  storagePath: string
  signedUrl: string
  ivBase64: string
  encryptionKeyBase64: string
}

/**
 * El bucket `analysis-files` tiene una allowlist de MIME types. El contenido
 * se cifra antes de subir, pero Supabase igual valida el `contentType`: hay que
 * declarar el tipo original del archivo, no `application/octet-stream`.
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
 * Cifra el archivo con AES-256-GCM ANTES de subirlo a Supabase Storage.
 * Devuelve la ruta de almacenamiento, URL firmada, IV y clave de cifrado
 * (ambos en base64 para poder pasarse al backend).
 */
export async function uploadFileToStorage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const supabase = createClient()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${Date.now()}-${safeFileName}.enc`

  // Generar clave efímera y cifrar antes de subir
  const key = await generateFileEncryptionKey()
  const { encrypted, iv } = await encryptFileAES256GCM(file, key)

  const { error: uploadError } = await supabase
    .storage
    .from('analysis-files')
    .upload(storagePath, encrypted, {
      contentType: resolveUploadContentType(file),
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw new Error(`Error al subir archivo: ${uploadError?.message || 'desconocido'}`)
  }

  // URL firmada temporal (1 hora) para que el microservicio descargue y descifre
  const { data: signedData, error: signedError } = await supabase
    .storage
    .from('analysis-files')
    .createSignedUrl(storagePath, 3600)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`Error al generar URL firmada: ${signedError?.message || 'desconocido'}`)
  }

  const keyRaw = await exportKeyRaw(key)

  return {
    storagePath,
    signedUrl: signedData.signedUrl,
    ivBase64: toBase64(iv),
    encryptionKeyBase64: toBase64(keyRaw),
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

  // Eliminar el archivo de Storage si existe la ruta
  if (storagePath) {
    await supabase.storage.from('analysis-files').remove([storagePath])
  }

  await supabase.from('analyses').delete().eq('id', analysisId)
}

/** Evita que un análisis quede "procesando" para siempre si el servicio no responde. */
export async function markAnalysisFailed(analysisId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('analyses').update({ status: 'error' }).eq('id', analysisId)
}

