import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { getCompanies, createCompany } from '@/lib/services/company.service'

const createCompanySchema = z.object({
  company_name: z.string().min(2, 'Nombre de empresa requerido'),
  business_name: z.string().optional(),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
})

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const companies = await getCompanies(supabase, user.id)

    return successResponse({ companies })

  } catch (err) {
    return handleApiError(err, 'GET /api/companies')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const body = await request.json()
    const validated = createCompanySchema.parse(body)

    const company = await createCompany(supabase, user.id, validated)

    return successResponse({ company })

  } catch (err) {
    return handleApiError(err, 'POST /api/companies')
  }
}
