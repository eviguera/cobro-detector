import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

type SupabaseClientType = SupabaseClient<Database>

interface CreditInfo {
  total: number
  used: number
  left: number
}

async function getCreditInfo(
  supabase: SupabaseClientType,
  userId: string,
  companyId?: string | null
): Promise<CreditInfo | null> {
  const query = supabase
    .from('credits')
    .select('total, used')
    .eq('user_id', userId)
  
  if (companyId) {
    query.eq('company_id', companyId)
  } else {
    query.is('company_id', null)
  }
  
  const { data, error } = await query.single()
  
  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null
    }
    throw error
  }
  
  return {
    total: data.total ?? 0,
    used: data.used ?? 0,
    left: (data.total ?? 0) - (data.used ?? 0)
  }
}

export async function consumeCreditAtomic(
  supabase: SupabaseClientType,
  userId: string,
  companyId?: string | null
): Promise<boolean> {
  // Intentar RPC consume_credit (función PostgreSQL, user_id deriva de auth.uid())
  const { data, error } = await supabase
    .rpc('consume_credit', { p_company_id: companyId ?? null })
  
  if (!error) {
    return data ?? false
  }

  // Si la función RPC no existe (PGRST202), usar update con CAS (compare-and-swap)
  if (error.code === 'PGRST202' || error.message?.includes('function not found')) {
    console.warn('consume_credit RPC not found, using CAS fallback')

    const { data: credits } = await supabase
      .from('credits')
      .select('total, used')
      .eq('user_id', userId)
      .is('company_id', companyId ?? null)
      .single()

    if (!credits) return false

    const left = (credits.total ?? 0) - (credits.used ?? 0)
    if (left <= 0) return false

    // CAS: solo actualiza si used no cambió desde que lo leímos
    const { error: updateError } = await supabase
      .from('credits')
      .update({ used: (credits.used ?? 0) + 1 })
      .eq('user_id', userId)
      .eq('used', credits.used ?? 0)
      .is('company_id', companyId ?? null)

    if (updateError) {
      console.error('Error in credit CAS fallback:', updateError)
      return false
    }

    return true
  }

  console.error('Error consuming credit:', error)
  return false
}

// Función para encolar análisis (crea registro y descuenta crédito)
export async function createAnalysisRecord(
  supabase: SupabaseClientType,
  userId: string,
  fileName: string,
  fileType: string,
  fileUrl: string,
  companyId?: string | null
): Promise<string | null> {
  // Verificar créditos PRIMERO (sin consumirlos)
  const creditInfo = await getCreditInfo(supabase, userId, companyId)
  const creditsLeft = creditInfo ? creditInfo.left : 0
  if (creditsLeft <= 0) {
    console.warn(`Usuario ${userId} sin créditos disponibles`)
    return null
  }

  // Crear registro de análisis (solo columnas que existen en la tabla)
  const insertData: Record<string, unknown> = {
    user_id: userId,
    file_name: fileName,
    file_type: fileType,
    file_url: fileUrl,
    status: 'processing',
  }
  if (companyId) {
    insertData.company_id = companyId
  }

  const { data: analysis, error } = await supabase
    .from('analyses')
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creando registro de análisis:', error)
    throw error
  }
  
  // Descontar crédito DESPUÉS (solo si el registro se creó)
  const consumed = await consumeCreditAtomic(supabase, userId, companyId)
  
  if (!consumed) {
    console.error('No se pudo consumir crédito para análisis:', analysis.id)
    // No eliminar el análisis - se queda para que el usuario vea el error
    return analysis.id
  }
  
  return analysis.id
}


