import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import type { Credits } from '@/types/database.types'
import { processAnalysisAsync } from '@/lib/analysis-worker'

export const maxDuration = 10 // 10s timeout para Vercel (solo registro inicial)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Rate limiting real con Redis (Upstash)
    const rateCheck = await checkAnalyzeRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta más tarde.', retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 3600) } }
      )
    }

    // Obtener archivo y company_id
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('company_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 10MB)' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    const allowedExtensions = ['.pdf', '.csv', '.xlsx', '.xls']
    const hasValidType = allowedTypes.includes(file.type) || allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!hasValidType) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Usa PDF, Excel o CSV.' }, { status: 400 })
    }

    // ============================================
    // VERIFICAR Y DESCONTAR CRÉDITOS (SIEMPRE)
    // ============================================
    
    // 1. Buscar registro de créditos
    const creditsQuery = supabase
      .from('credits')
      .select('*')
      .eq('user_id', user.id)

    if (companyId) {
      creditsQuery.eq('company_id', companyId)
    } else {
      creditsQuery.is('company_id', null)
    }

    const { data: credits, error: creditsError } = await creditsQuery.single()
    
    if (creditsError || !credits) {
      console.error('❌ Error obteniendo créditos:', creditsError)
      return NextResponse.json({ 
        error: 'No se encontró registro de créditos. Contacta soporte.' 
      }, { status: 500 })
    }

    // Asegurar que credits no es null para TypeScript
    const creditsData: Credits = credits as Credits

    console.log(`💰 Créditos encontrados: total=${creditsData.total}, used=${creditsData.used}`)

    // 2. Calcular créditos restantes
    const creditsLeft = (creditsData.total ?? 0) - (creditsData.used ?? 0)
    console.log(`💰 Créditos restantes: ${creditsLeft}`)

    // 3. Si no hay créditos, decir que compre más y redirigir a precios
    if (creditsLeft <= 0) {
      console.log(`❌ Sin créditos: left=${creditsLeft}`)
      return NextResponse.json({ 
        error: 'Sin créditos disponibles', 
        creditsLeft: 0,
        message: 'No tienes créditos. Compra más en /precios',
        redirectTo: '/precios'
      }, { status: 402 })
    }

    // 4. Descontar crédito AHORA (antes de crear análisis)
    const newUsed = (creditsData.used ?? 0) + 1
    console.log(`🔻 Descontando crédito: ${creditsData.used} → ${newUsed} (total: ${creditsData.total})`)

    const updateQuery = (supabase as any)
      .from('credits')
      .update({ used: newUsed })
      .eq('user_id', user.id)

    if (companyId) {
      updateQuery.eq('company_id', companyId)
    } else {
      updateQuery.is('company_id', null)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      console.error('❌ Error descontando crédito:', updateError)
      return NextResponse.json({ 
        error: 'Error al procesar créditos. Intenta nuevamente.' 
      }, { status: 500 })
    }

    console.log(`✅ Crédito descontado exitosamente. Nuevo used: ${newUsed}`)

    // ============================================
    // REGISTRAR ANÁLISIS
    // ============================================
    
    const { data: analysis, error: insertError } = await (supabase as any)
      .from('analyses')
      .insert({
        user_id: user.id,
        company_id: companyId || null,
        file_name: file.name,
        file_type: file.type || 'unknown',
        status: 'processing',
        total_transactions: 0,
        anomalies_count: 0,
        recoverable_amount: 0,
      })
      .select()
      .single()

    if (insertError || !analysis) {
      console.error('❌ Error creando análisis:', insertError)
      // TODO: Revertir descuento de crédito si falla
      return NextResponse.json({ error: 'Error al crear análisis' }, { status: 500 })
    }

    console.log(`📊 Análisis creado: ${analysis.id}`)

    // ============================================
    // PROCESAR ANÁLISIS (ASÍNCRONO)
    // ============================================
    
    const buffer = await file.arrayBuffer()

    processAnalysisAsync(
      analysis.id,
      buffer,
      file.name,
      user.id,
      companyId
    ).catch(err => {
      console.error('❌ Error en procesamiento asíncrono:', err)
    })

    // Retornar inmediatamente con el ID del análisis
    return NextResponse.json({
      analysisId: analysis.id,
      status: 'processing',
      creditsLeft: creditsLeft - 1,
      message: 'Análisis iniciado. Consulta el estado con GET /api/analyses/[id]',
    })

  } catch (err) {
    console.error('❌ Analysis error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
