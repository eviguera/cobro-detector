import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import type { Credits } from '@/types/database.types'
import type { Database } from '@/types/database.types'
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

    // Obtener archivo y company_id primero
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

    // Verificar si el usuario tiene plan de éxito activo
    const { data: activeSuccessOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan', 'success_fee')
      .eq('status', 'paid')
      .eq('success_plan_active', true)
      .single()

    const hasSuccessPlan = !!activeSuccessOrder

    let credits: Credits | null = null

    // Verificar créditos (solo si no tiene plan de éxito)
    if (!hasSuccessPlan) {
      const creditsQuery = supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)

      if (companyId) {
        creditsQuery.eq('company_id', companyId)
      } else {
        creditsQuery.is('company_id', null)
      }

      const creditsResult = await creditsQuery.single()
      // TypeScript no infiere bien el tipo de .single(), así que casteamos
      credits = (creditsResult.data ?? null) as Credits | null

      const creditsLeft = (credits?.total ?? 0) - (credits?.used ?? 0)
      if (creditsLeft <= 0) {
        return NextResponse.json({ error: 'Sin créditos disponibles' }, { status: 402 })
      }
    }

    // Registrar análisis en DB (estado: processing)
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
      return NextResponse.json({ error: 'Error al crear análisis' }, { status: 500 })
    }

    // Descontar crédito (solo si no tiene plan de éxito)
    if (!hasSuccessPlan && credits) {
      const newUsed = (credits.used ?? 0) + 1
      
      let error: Error | null = null
      
      if (companyId) {
        const { error: creditError } = await (supabase as any)
          .from('credits')
          .update({ used: newUsed })
          .eq('user_id', user.id)
          .eq('company_id', companyId)
        error = creditError
      } else {
        const { error: creditError } = await (supabase as any)
          .from('credits')
          .update({ used: newUsed })
          .eq('user_id', user.id)
          .is('company_id', null)
        error = creditError
      }

      if (error) {
        console.error('Error al descontar crédito:', error)
      }
    }

    // Obtener buffer del archivo para procesamiento asíncrono
    const buffer = await file.arrayBuffer()

    // Iniciar procesamiento asíncrono (fire and forget)
    processAnalysisAsync(
      analysis.id,
      buffer,
      file.name,
      user.id,
      companyId
    ).catch(err => {
      console.error('Error en procesamiento asíncrono:', err)
    })

    // Retornar inmediatamente con el ID del análisis
    return NextResponse.json({
      analysisId: analysis.id,
      status: 'processing',
      message: 'Análisis iniciado. Consulta el estado con GET /api/analyses/[id]',
    })

  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
