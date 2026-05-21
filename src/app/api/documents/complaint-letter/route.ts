import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWordDocument } from '@/lib/document-generator'
import type { Analysis, Anomaly } from '@/types/database.types'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'
const bodySchema = z.object({
  analysisId: z.string().uuid('analysisId debe ser un UUID válido'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { analysisId } = parsed.data

    const [analysisResult, anomaliesResult, profileResult] = await Promise.all([
      supabase.from('analyses').select('*').eq('id', analysisId).eq('user_id', user.id).single(),
      supabase.from('anomalies').select('*').eq('analysis_id', analysisId).eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    const { data: analysis, error: analysisError } = analysisResult
    const { data: anomalies, error: anomaliesError } = anomaliesResult
    const { data: profile } = profileResult

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    if (anomaliesError) {
      return NextResponse.json({ error: 'Error obteniendo anomalías' }, { status: 500 })
    }

    const letterData = {
      analysis: analysis as unknown as Analysis,
      anomalies: (anomalies ?? []) as unknown as Anomaly[],
      bankName: analysis.bank || 'No especificado',
      businessName: profile?.business_name || '',
      userName: profile?.full_name || user.email || 'Usuario',
      rut: profile?.rut || '',
      date: new Date().toLocaleDateString('es-CL'),
    }

    const buffer = await generateWordDocument(letterData)

    const bankSlug = (analysis.bank || 'banco').toLowerCase().replace(/\s+/g, '_')
    const today = new Date().toISOString().split('T')[0]

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="carta_reclamo_${bankSlug}_${today}.docx"`,
      },
    })

  } catch (err) {
    return handleApiError(err, 'POST /api/documents/complaint-letter')
  }
}
