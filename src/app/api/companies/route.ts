import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database.types'
import { z } from 'zod'

const createCompanySchema = z.object({
  company_name: z.string().min(2, 'Nombre de empresa requerido'),
  business_name: z.string().optional(),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('accountant_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error obteniendo empresas' }, { status: 500 })
    }

    return NextResponse.json({ companies: companies as Company[] })

  } catch (err) {
    console.error('Error en GET /api/companies:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createCompanySchema.parse(body)

    const { data: company, error } = await (supabase as any)
      .from('companies')
      .insert({
        accountant_id: user.id,
        company_name: validated.company_name,
        business_name: validated.business_name,
        rut: validated.rut,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        industry: validated.industry,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando empresa:', error)
      return NextResponse.json({ error: 'Error creando empresa' }, { status: 500 })
    }

    // Crear créditos para esta empresa (1 análisis gratis)
    await (supabase as any)
      .from('credits')
      .insert({
        user_id: user.id,
        company_id: company.id,
        total: 1,
        used: 0,
      })

    return NextResponse.json({ company: company as Company })

  } catch (err) {
    console.error('Error en POST /api/companies:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
