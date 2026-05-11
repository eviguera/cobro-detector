import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { handleApiError } from '@/lib/api-error'

type SupabaseClientType = SupabaseClient<Database>

export interface CreditInfo {
  total: number
  used: number
  left: number
}

export async function getCreditInfo(
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
  const { data, error } = await supabase
    .rpc('consume_credit', { p_user_id: userId })
  
  if (error) {
    console.error('Error consuming credit:', error)
    throw error
  }
  
  return data ?? false
}

// Función para encolar análisis (crea registro y descuenta crédito)
export async function enqueueAnalysis(
  supabase: SupabaseClientType,
  userId: string,
  fileName: string,
  fileType: string,
  fileUrl: string,
  companyId?: string | null
): Promise<string | null> {
  // Crear registro de análisis PRIMERO
  const { data: analysis, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      company_id: companyId ?? null,
      file_name: fileName,
      file_type: fileType,
      file_url: fileUrl,
      status: 'queued',
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creando registro de análisis:', error)
    throw error
  }
  
  // Descontar crédito DESPUÉS (solo si el registro se creó)
  const consumed = await consumeCreditAtomic(supabase, userId, companyId)
  
  if (!consumed) {
    // Si no hay créditos, eliminar el análisis creado
    await supabase.from('analyses').delete().eq('id', analysis.id)
    return null
  }
  
  return analysis.id
}

export async function addCredits(
  supabase: SupabaseClientType,
  userId: string,
  amount: number,
  companyId?: string | null
): Promise<void> {
  const { error } = await supabase
    .from('credits')
    .upsert({
      user_id: userId,
      company_id: companyId ?? null,
      total: amount,
      used: 0,
    }, {
      onConflict: 'user_id, company_id',
      ignoreDuplicates: false
    })
  
  if (error) {
    throw error
  }
}

export async function incrementCredits(
  supabase: SupabaseClientType,
  userId: string,
  amount: number,
  companyId?: string | null
): Promise<void> {
  const creditInfo = await getCreditInfo(supabase, userId, companyId)
  
  const { error } = await supabase
    .from('credits')
    .update({ total: (creditInfo?.total ?? 0) + amount })
    .eq('user_id', userId)
    .is('company_id', companyId ?? null)
  
  if (error) {
    throw error
  }
}
