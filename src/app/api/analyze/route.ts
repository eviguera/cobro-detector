import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { checkStrictRateLimit } from '@/lib/rate-limit'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import {
  uploadFileToStorage,
  createAnalysisWithPlan,
  executeAndStoreAnalysis,
  enqueueAnalysisFallback,
  markAnalysisError,
  getCreditsLeft,
  NoCreditsError,
} from '@/lib/services/analysis.service'

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

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
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
          },
        },
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return authError()
    }

    const formData = await request.formData()
    const rawFile = formData.get('file')

    const parsed = analyzeSchema.safeParse({ file: rawFile })
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const file = parsed.data.file
    const planFromForm = formData.get('plan') as string | null
    const isPlatino = planFromForm === 'platino'

    console.log(`Usuario: ${user.id}, Archivo: ${file.name}${isPlatino ? ', Plan: Platino' : ''}`)

    const { fileUrl } = await uploadFileToStorage(file, user.id)

    let analysisId: string
    try {
      analysisId = await createAnalysisWithPlan(user.id, file, fileUrl, isPlatino)
    } catch (err) {
      if (err instanceof NoCreditsError) {
        const creditsLeft = await getCreditsLeft(user.id)
        return NextResponse.json({
          error: creditsLeft <= 0 ? 'Sin créditos' : 'Error procesando créditos',
          redirectTo: '/precios',
          creditsLeft,
        }, { status: 402 })
      }
      throw err
    }

    try {
      const result = await executeAndStoreAnalysis(
        user.id,
        analysisId,
        fileUrl,
        file.type,
        file.name,
        isPlatino,
      )

      revalidateTag(`dashboard-${user.id}`)
      revalidateTag(`analyses-${user.id}`)

      return successResponse({
        success: true,
        analysisId,
        ...result,
      })
    } catch (syncError) {
      const errorMsg = syncError instanceof Error ? syncError.message : 'Error desconocido'
      console.error('❌ Error en análisis síncrono:', errorMsg)

      await markAnalysisError(analysisId, user.id)
      enqueueAnalysisFallback(user.id, analysisId, fileUrl, file.type, file.name)

      return successResponse({
        success: true,
        analysisId,
        syncError: errorMsg,
        message: 'El análisis falló en línea. Puedes revisar el historial para ver si se completó en segundo plano.',
      })
    }
  } catch (err) {
    console.error('CRITICAL: Error en /api/analyze:', err instanceof Error ? { message: err.message, name: err.name } : err)
    return handleApiError(err, 'POST /api/analyze')
  }
}
