import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database.types'
import { z } from 'zod'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: company, error } = await (supabase as any)
      .from('companies')
      .select('*')
      .eq('id', params.id)
      .eq('accountant_id', user.id)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    // Obtener créditos de la empresa
    const { data: credits } = await (supabase as any)
      .from('credits')
      .select('*')
      .eq('company_id', params.id)
      .single()

    // Obtener análisis recientes
    const { data: analyses } = await (supabase as any)
      .from('analyses')
      .select('id, file_name, bank, status, created_at')
      .eq('company_id', params.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      company: company as Company,
      credits: credits || null,
      recentAnalyses: analyses || [],
    })

  } catch (err) {
    console.error('Error en GET /api/companies/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateCompanySchema.parse(body)

    const { data: company, error } = await (supabase as any)
      .from('companies')
      .update(validated)
      .eq('id', params.id)
      .eq('accountant_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando empresa:', error)
      return NextResponse.json({ error: 'Error actualizando empresa' }, { status: 500 })
    }

    return NextResponse.json({ company: company as Company })

  } catch (err) {
    console.error('Error en PATCH /api/companies/[id]:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Soft delete: marcar como inactiva
    const { error } = await (supabase as any)
      .from('companies')
      .update({ is_active: false })
      .eq('id', params.id)
      .eq('accountant_id', user.id)

    if (error) {
      console.error('Error eliminando empresa:', error)
      return NextResponse.json({ error: 'Error eliminando empresa' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Error en DELETE /api/companies/[id]:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
