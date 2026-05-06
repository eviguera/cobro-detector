import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { checkStrictRateLimit } from '@/lib/rate-limit'
import { consumeCreditAtomic, enqueueAnalysis as enqueueAnalysisService } from '@/lib/services/credit.service'
import { enqueueAnalysis } from '@/lib/analysis-queue'
import { revalidateTag } from 'next/cache'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? '127.0.0.1'
    const rateCheck = await checkStrictRateLimit(ip)
    
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateCheck.limit ?? 3),
            'X-RateLimit-Remaining': String(rateCheck.remaining ?? 0),
            'X-RateLimit-Reset': String(rateCheck.reset ?? 60),
          }
        }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    // Obtener archivo
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Use PDF o Excel.' },
        { status: 400 }
      )
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 10MB.' },
        { status: 400 }
      )
    }

    console.log(`📄 Usuario: ${user.id}, Archivo: ${file.name}`)

    // Guardar archivo
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    
    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('analysis-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError)
      return handleApiError(uploadError, 'POST /api/analyze - upload file')
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('analysis-files')
      .getPublicUrl(fileName)

    // Crear registro de análisis usando el servicio
    const analysisId = await enqueueAnalysisService(
      supabase,
      user.id,
      file.name,
      publicUrl,
      null // companyId
    )

    if (!analysisId) {
      // Obtener créditos restantes
      const { data: credits } = await supabase
        .from('credits')
        .select('total, used')
        .eq('user_id', user.id)
        .is('company_id', null)
        .single()
      
      const left = (credits?.total ?? 0) - (credits?.used ?? 0)
      
      return NextResponse.json({
        error: left <= 0 ? 'Sin créditos' : 'Error procesando créditos',
        redirectTo: '/precios',
        creditsLeft: Math.max(0, left)
      }, { status: 402 })
    }

    // Encolar el análisis para procesamiento asíncrono
    try {
      await enqueueAnalysis({
        userId: user.id,
        fileName: file.name,
        filePath: publicUrl,
        fileType: file.type,
        companyId: null,
        analysisId,
      })
      console.log(`✅ Análisis encolado: ${analysisId}`)
    } catch (queueError) {
      console.error('Error encolando análisis:', queueError)
      // No fallar la petición, el análisis se puede procesar luego
    }

    // Invalidar caché del dashboard y análisis
    revalidateTag(`dashboard-${user.id}`)
    revalidateTag(`analyses-${user.id}`)

    return successResponse({
      success: true,
      message: 'Análisis creado. Se procesará en breve.',
      analysisId,
    })

  } catch (err) {
    return handleApiError(err, 'POST /api/analyze')
  }
}
