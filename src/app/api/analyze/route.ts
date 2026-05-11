import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { checkStrictRateLimit } from '@/lib/rate-limit'
import { consumeCreditAtomic, enqueueAnalysis as enqueueAnalysisService } from '@/lib/services/credit.service'
import { enqueueAnalysis } from '@/lib/analysis-queue'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
] as const

const analyzeSchema = z.object({
  file: z.instanceof(File, { message: 'Se requiere un archivo' })
    .refine(f => f.size > 0, { message: 'El archivo está vacío' })
    .refine(f => f.size <= 10 * 1024 * 1024, { message: 'Archivo demasiado grande. Máximo 10MB.' })
    .refine(f => ALLOWED_MIME_TYPES.includes(f.type as typeof ALLOWED_MIME_TYPES[number]) || /\.(pdf|xlsx|xls|csv)$/i.test(f.name), {
      message: 'Tipo de archivo no soportado. Use PDF, Excel o CSV.',
    }),
})

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

    // Obtener y validar archivo con Zod
    const formData = await request.formData()
    const rawFile = formData.get('file')

    const parsed = analyzeSchema.safeParse({ file: rawFile })
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const file = parsed.data.file

    console.log(`Usuario: ${user.id}, Archivo: ${file.name}`)

    // Guardar archivo
    const fileBuffer = await file.arrayBuffer()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${user.id}/${Date.now()}-${safeFileName}`
    
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
      file.type,
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
    console.error('CRITICAL: Error en /api/analyze:', err instanceof Error ? { message: err.message, name: err.name, stack: err.stack?.split('\n').slice(0, 3).join('\n') } : err)
    return handleApiError(err, 'POST /api/analyze')
  }
}
