import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse } from '@/lib/api-error'
import { enqueueAnalysis as enqueueAnalysisService } from '@/lib/services/credit.service'
import { processAnalysis } from '@/lib/analysis-queue'
import { revalidateTag } from 'next/cache'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Use PDF, Excel o CSV.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 10MB.' },
        { status: 400 }
      )
    }

    const { data: credits } = await supabase
      .from('credits')
      .select('total, used')
      .eq('user_id', user.id)
      .is('company_id', null)
      .single()
    
    const left = (credits?.total ?? 0) - (credits?.used ?? 0)
    
    if (left <= 0) {
      return NextResponse.json({
        error: 'Sin créditos',
        redirectTo: '/precios',
      }, { status: 402 })
    }

    const fileBuffer = await file.arrayBuffer()
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('analysis-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    const fileUrl = uploadError ? '' : supabase.storage.from('analysis-files').getPublicUrl(fileName).data.publicUrl

    const analysisId = await enqueueAnalysisService(
      supabase,
      user.id,
      file.name,
      fileUrl || '',
      null
    )

    if (!analysisId) {
      return NextResponse.json({
        error: 'Error procesando créditos',
        redirectTo: '/precios',
      }, { status: 402 })
    }

    try {
      await processAnalysis({
        userId: user.id,
        fileName: file.name,
        filePath: fileUrl || '',
        fileType: file.type,
        companyId: null,
        analysisId,
      })
    } catch (processError: any) {
      console.error('Error procesando análisis:', processError)
      return NextResponse.json({
        success: true,
        message: 'Análisis creado pero falló el procesamiento',
        analysisId,
        error: processError.message,
      })
    }

    const { data: analysisData } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    const { data: anomaliesData } = await supabase
      .from('anomalies')
      .select('*')
      .eq('analysis_id', analysisId)

    revalidateTag(`dashboard-${user.id}`)
    revalidateTag(`analyses-${user.id}`)

    return successResponse({
      success: true,
      analysisId,
      totalTransactions: analysisData?.total_transactions ?? 0,
      anomaliesCount: analysisData?.anomalies_count ?? 0,
      recoverableAmount: analysisData?.recoverable_amount ?? 0,
      anomalies: (analysisData?.anomalies as any) ?? anomaliesData ?? [],
      summary: analysisData?.ai_summary ?? '',
    })

  } catch (err: any) {
    console.error('Error en POST /api/analyze:', err)
    return NextResponse.json(
      { error: err.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
