import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authError, handleApiError, successResponse } from '@/lib/api-error'
import { checkStrictRateLimit } from '@/lib/rate-limit'
import { consumeCreditAtomic, enqueueAnalysis as enqueueAnalysisService } from '@/lib/services/credit.service'
import { analyzeFile } from '@/lib/analyzer'
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

export const maxDuration = 120

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

    // Procesar análisis síncronamente (Vercel serverless mata fire-and-forget)
    let syncSuccess = false
    let syncResult: any = null

    try {
      // Actualizar estado a 'processing'
      await supabase.from('analyses').update({ status: 'processing' }).eq('id', analysisId).eq('user_id', user.id)

      // Ejecutar análisis (síncrono)
      const result = await analyzeFile(publicUrl, file.type, {
        userId: user.id,
        companyId: null,
        fileName: file.name,
      })

      const txCount = result.totalTransactions ?? 0
      const anomalyCount = result.anomalies?.length ?? 0
      console.log(`📊 Análisis ${analysisId}: ${txCount} transacciones, ${anomalyCount} anomalías`)

      if (result.success === false) {
        throw new Error('analyzeFile retornó error')
      }

      // Guardar resultados en BD
      await supabase.from('analyses').update({
        status: 'completed',
        anomalies_count: anomalyCount,
        total_transactions: txCount,
        recoverable_amount: result.totalRecoverable ?? 0,
        period_start: result.period?.start ?? null,
        period_end: result.period?.end ?? null,
        bank: result.bank ?? null,
        anomalies: result.anomalies ?? [],
        ai_summary: result.aiSummary ?? null,
        raw_data: result.transactions ?? [],
      }).eq('id', analysisId).eq('user_id', user.id)

      // Insertar anomalías en la tabla individual
      if (result.anomalies && result.anomalies.length > 0) {
        const anomaliesToInsert = result.anomalies.map((anomaly: any) => ({
          analysis_id: analysisId,
          user_id: user.id,
          type: anomaly.type,
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          detail: anomaly.detail ?? null,
          recoverable_amount: anomaly.recoverableAmount,
          transaction_refs: anomaly.transactionRefs,
          status: 'pending',
        }))

        const { error: insertError } = await supabase
          .from('anomalies')
          .insert(anomaliesToInsert)

        if (insertError) {
          console.error('Error insertando anomalías:', insertError)
        }
      }

      syncSuccess = true
      syncResult = {
        totalTransactions: txCount,
        anomaliesCount: anomalyCount,
        recoverableAmount: result.totalRecoverable ?? 0,
        anomalies: result.anomalies ?? [],
        summary: result.aiSummary ?? undefined,
        bank: result.bank ?? undefined,
      }
    } catch (syncError) {
      console.error('Error en análisis síncrono, fallback a async:', syncError)
      // Marcar como error
      await supabase.from('analyses').update({ status: 'error' }).eq('id', analysisId).eq('user_id', user.id)

      // Fallback: intentar procesamiento asíncrono
      enqueueAnalysis({
        userId: user.id,
        fileName: file.name,
        filePath: publicUrl,
        fileType: file.type,
        companyId: null,
        analysisId,
      }).catch(err => console.error('Error en fallback async:', err))
    }

    // Invalidar caché
    revalidateTag(`dashboard-${user.id}`)
    revalidateTag(`analyses-${user.id}`)

    if (syncSuccess) {
      return successResponse({
        success: true,
        analysisId,
        ...syncResult,
      })
    }

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
