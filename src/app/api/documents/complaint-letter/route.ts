import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWordDocument } from '@/lib/document-generator'
import type { Analysis, Anomaly } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { analysisId } = body

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId es requerido' }, { status: 400 })
    }

    // Obtener el análisis
    const { data: analysis, error: analysisError } = await (supabase as any)
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    // Obtener anomalías del análisis
    const { data: anomalies, error: anomaliesError } = await (supabase as any)
      .from('anomalies')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)

    if (anomaliesError) {
      return NextResponse.json({ error: 'Error obteniendo anomalías' }, { status: 500 })
    }

    // Obtener perfil del usuario
    const { data: profile } = await (supabase as any)
      .from('profiles')
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

    // Generar documento Word
    const buffer = await generateWordDocument(letterData)

    // Retornar el documento como descarga
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="carta_reclamo_${analysis.bank || 'banco'}_${new Date().toISOString().split('T')[0]}.docx"`,
      },
    })

  } catch (err) {
    console.error('Error generando carta de reclamo:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
