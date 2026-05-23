import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database.types'
import { z } from 'zod'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { getCompanyById, updateCompany, deleteCompany } from '@/lib/services/company.service'

const updateCompanySchema = z.object({
  company_name: z.string().min(2).optional(),
  business_name: z.string().optional(),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  is_active: z.boolean().optional(),
})

const paramsSchema = z.object({
  id: z.string().uuid('ID de empresa inválido'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = paramsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const company = await getCompanyById(supabase, parsed.data.id, user.id)

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    return successResponse({
      company: company as Company,
      credits: company.credits?.[0] || null,
      recentAnalyses: company.analyses || [],
    })

  } catch (err) {
    return handleApiError(err, 'GET /api/companies/[id]')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = paramsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const body = await request.json()
    const validated = updateCompanySchema.parse(body)

    const company = await updateCompany(supabase, parsed.data.id, user.id, validated)

    return successResponse({ company })

  } catch (err) {
    return handleApiError(err, 'PATCH /api/companies/[id]')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = paramsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    await deleteCompany(supabase, parsed.data.id, user.id)

    return successResponse({ success: true })

  } catch (err) {
    return handleApiError(err, 'DELETE /api/companies/[id]')
  }
}
