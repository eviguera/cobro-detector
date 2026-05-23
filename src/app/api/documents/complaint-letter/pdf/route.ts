import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tables } from '@/lib/supabase/db'
import { generatePDFDocument } from '@/lib/document-generator'
import type { Analysis, Anomaly } from '@/types/database.types'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

const bodySchema = z.object({
  analysisId: z.string().uuid('analysisId debe ser un UUID válido'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const db = tables(supabase)
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

    // @supabase/ssr type inference limitation — all table queries return `never` types.
    // Cast required to unblock .from().select() chaining.
    // Obtener el análisis
    const { data: analysis, error: analysisError } = await db.analyses
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    // Obtener anomalías del análisis
    const { data: anomalies, error: anomaliesError } = await db.anomalies
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)

    if (anomaliesError) {
      return NextResponse.json({ error: 'Error obteniendo anomalías' }, { status: 500 })
    }

    // Obtener perfil del usuario
    const { data: profile } = await db.profiles
      .select('*')
      .eq('id', user.id)
      .single()

    const letterData = {
      analysis: analysis as unknown as Analysis,
      anomalies: anomalies as unknown as Anomaly[],
      bankName: analysis.bank || 'No especificado',
      businessName: profile?.business_name || '',
      userName: profile?.full_name || user.email || 'Usuario',
      rut: profile?.rut || '',
      date: new Date().toLocaleDateString('es-CL'),
    }

    // Generar documento PDF
    const buffer = await generatePDFDocument(letterData)

    // Retornar el documento como descarga
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carta_reclamo_${analysis.bank || 'banco'}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })

  } catch (err) {
    return handleApiError(err, 'POST /api/documents/complaint-letter/pdf')
  }
}
