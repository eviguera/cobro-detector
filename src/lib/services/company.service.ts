import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { Company } from '@/types/database.types'

type SupabaseClientType = SupabaseClient<Database>

export interface CreateCompanyData {
  company_name: string
  business_name?: string
  rut?: string
  email?: string
  phone?: string
  address?: string
  industry?: string
}

export interface UpdateCompanyData {
  company_name?: string
  business_name?: string
  rut?: string
  email?: string
  phone?: string
  address?: string
  industry?: string
  is_active?: boolean
}

export async function getCompanies(
  supabase: SupabaseClientType,
  userId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('accountant_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Company[]
}

export async function getCompanyById(
  supabase: SupabaseClientType,
  companyId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      credits(*),
      analyses:id, file_name, bank, status, created_at)
    `)
    .eq('id', companyId)
    .eq('accountant_id', userId)
    .order('created_at', { foreignTable: 'analyses', ascending: false })
    .limit(5, 'analyses')
    .single()
  
  if (error) throw error
  return data
}

export async function createCompany(
  supabase: SupabaseClientType,
  userId: string,
  data: CreateCompanyData
) {
  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      accountant_id: userId,
      company_name: data.company_name,
      business_name: data.business_name,
      rut: data.rut,
      email: data.email,
      phone: data.phone,
      address: data.address,
      industry: data.industry,
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Crear créditos para la empresa (1 análisis gratis)
  const { error: creditError } = await supabase
    .from('credits')
    .insert({
      user_id: userId,
      company_id: company.id,
      total: 1,
      used: 0,
    })
  
  if (creditError) throw creditError
  
  return company as Company
}

export async function updateCompany(
  supabase: SupabaseClientType,
  companyId: string,
  userId: string,
  data: UpdateCompanyData
) {
  const { data: company, error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', companyId)
    .eq('accountant_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return company as Company
}

export async function deleteCompany(
  supabase: SupabaseClientType,
  companyId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: false })
    .eq('id', companyId)
    .eq('accountant_id', userId)
  
  if (error) throw error
}
