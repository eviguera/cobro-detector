import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import type { Credits } from '@/types/database.types'
import { processAnalysisAsync } from '@/lib/analysis-worker'

export const maxDuration = 10 // 10s timeout para Vercel (solo registro inicial)

// Verificar variables de entorno requeridas
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const missingVars = requiredEnvVars.filter(v => !process.env[v])
if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars)
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 /api/analyze: Inicio de solicitud')
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Auth error:', authError?.message)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    console.log(`👤 Usuario autenticado: ${user.id}`)
    
    // Obtener archivo
    let file: File | null = null
    try {
      const formData = await request.formData()
      file = formData.get('file') as File | null
    } catch (formError) {
      console.error('❌ Error leyendo FormData:', formError)
      return NextResponse.json({ error: 'Error al leer archivo' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    console.log(`📄 Archivo: ${file.name} (${file.size} bytes)`)

    // ===========================================
    // VERIFICAR CRÉDITOS (SIMPLIFICADO)
    // ===========================================
    
    console.log('💰 Verificando créditos...')
    
    try {
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .is('company_id', null)
        .single()
      
      if (creditsError) {
        console.error('❌ Error obteniendo créditos:', creditsError.message)
        return NextResponse.json({ 
          error: 'Error al verificar créditos',
          details: creditsError.message 
        }, { status: 500 })
      }
      
      if (!credits) {
        console.error('❌ No se encontró registro de créditos')
        return NextResponse.json({ 
          error: 'No se encontró registro de créditos' 
        }, { status: 500 })
      }
      
      // Asegurar tipado correcto
      const creditsData = credits as any
      const creditsLeft = (creditsData.total ?? 0) - (creditsData.used ?? 0)
      console.log(`💰 Créditos: total=${creditsData.total}, used=${creditsData.used}, left=${creditsLeft}`)
      
      if (creditsLeft <= 0) {
        return NextResponse.json({ 
          error: 'Sin créditos',
          message: 'Compra más en /precios',
          redirectTo: '/precios'
        }, { status: 402 })
      }
      
      // Descontar 1 crédito
      const newUsed = (creditsData.used ?? 0) + 1
      console.log(`🔻 Descontando crédito: ${creditsData.used} → ${newUsed}`)
      
      const { error: updateError } = await (supabase as any)
        .from('credits')
        .update({ used: newUsed })
        .eq('id', creditsData.id)
      
      if (updateError) {
        console.error('❌ Error descontando crédito:', updateError.message)
        return NextResponse.json({ 
          error: 'Error al procesar créditos' 
        }, { status: 500 })
      }
      
      console.log(`✅ Crédito descontado. Nuevo used: ${newUsed}`)
      
    } catch (creditErr) {
      console.error('❌ Error inesperado con créditos:', creditErr)
      return NextResponse.json({ 
        error: 'Error procesando créditos' 
      }, { status: 500 })
    }

    // TODO: Implementar análisis asíncrono
    return NextResponse.json({
      success: true,
      message: 'Crédito descontado. Análisis pendiente de implementar.',
      userId: user.id,
      fileName: file.name,
    })

  } catch (err) {
    console.error('❌ Analysis error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}
