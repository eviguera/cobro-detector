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

    // TODO: Re-implementar lógica de créditos y análisis
    // Por ahora retornar un mensaje de éxito simulado
    return NextResponse.json({
      success: true,
      message: 'Análisis iniciado (modo diagnóstico)',
      analysisId: 'diag-' + Date.now(),
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
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
