import { createClient } from '@/lib/supabase/client'

export async function uploadFileToStorage(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const fileBuffer = await file.arrayBuffer()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${Date.now()}-${safeFileName}`

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('analysis-files')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError || !uploadData) {
    throw new Error(`Error al subir archivo: ${uploadError?.message || 'desconocido'}`)
  }

  // HARDENED (2026-11): bucket privado → signed URL temporal (1h) en vez de URL pública permanente.
  const { data: signedData, error: signedError } = await supabase
    .storage
    .from('analysis-files')
    .createSignedUrl(storagePath, 3600)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`Error al generar URL firmada: ${signedError?.message || 'desconocido'}`)
  }

  return signedData.signedUrl
}

export async function createAnalysisRecord(
  userId: string,
  fileName: string,
  fileType: string,
  fileUrl: string,
  isPlatino: boolean,
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_type: fileType,
      file_url: fileUrl,
      // `awaiting_payment` marca el plan Platino desde el inicio: analysis-svc
      // lo lee antes de ejecutar y decide si debe bloquear el reporte.
      status: isPlatino ? 'awaiting_payment' : 'processing',
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error('Error al crear análisis')
  }

  return data.id
}

export async function deleteAnalysisRecord(analysisId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('analyses').delete().eq('id', analysisId)
}

/** Evita que un análisis quede "procesando" para siempre si el servicio no responde. */
export async function markAnalysisFailed(analysisId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('analyses').update({ status: 'error' }).eq('id', analysisId)
}

export async function consumeCredit(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('consume_credit', {
    p_company_id: null,
  })

  if (!error) {
    return data ?? false
  }

  const { data: credits } = await supabase
    .from('credits')
    .select('total, used')
    .eq('user_id', userId)
    .is('company_id', null)
    .single()

  if (!credits) return false

  const left = (credits.total ?? 0) - (credits.used ?? 0)
  if (left <= 0) return false

  const { data: updated, error: updateError } = await supabase
    .from('credits')
    .update({ used: (credits.used ?? 0) + 1 })
    .eq('user_id', userId)
    .eq('used', credits.used ?? 0)
    .is('company_id', null)
    .select('user_id')

  // El update condicional puede afectar 0 filas si otra pestaña consumió el
  // crédito entre la lectura y la escritura. Sin esta comprobación se gastaba
  // dos veces el mismo crédito.
  return !updateError && (updated?.length ?? 0) > 0
}
