import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener archivo
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    console.log(`📄 Usuario: ${user.id}, Archivo: ${file.name}`)

    // ============================================
    // VERIFICAR Y DESCONTAR CRÉDITOS
    // ============================================

    // 1. Obtener créditos (usar any para evitar errores TS)
    const creditsResult = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user.id)
      .is('company_id', null)
      .single()

    const credits: any = creditsResult.data
    const creditsError = creditsResult.error

    if (creditsError || !credits) {
      console.error('❌ Error créditos:', creditsError?.message)
      return NextResponse.json({ error: 'Error verificando créditos' }, { status: 500 })
    }

    const total = credits.total ?? 0
    const used = credits.used ?? 0
    const left = total - used

    console.log(`💰 total=${total}, used=${used}, left=${left}`)

    if (left <= 0) {
      return NextResponse.json({
        error: 'Sin créditos',
        redirectTo: '/precios'
      }, { status: 402 })
    }

    // 2. Descontar 1 crédito
    const newUsed = used + 1
    console.log(`🔻 Descontando: ${used} → ${newUsed}`)

    const updateResult = await supabase
      .from('credits')
      .update({ used: newUsed })
      .eq('id', credits.id)

    if (updateResult.error) {
      console.error('❌ Error actualizando:', updateResult.error.message)
      return NextResponse.json({ error: 'Error procesando créditos' }, { status: 500 })
    }

    console.log(`✅ Crédito descontado. Nuevo used: ${newUsed}`)

    // TODO: Procesar análisis asíncrono
    return NextResponse.json({
      success: true,
      message: 'Crédito descontado. Análisis en proceso.',
      creditsLeft: left - 1,
      fileName: file.name,
    })

  } catch (err) {
    console.error('❌ Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
