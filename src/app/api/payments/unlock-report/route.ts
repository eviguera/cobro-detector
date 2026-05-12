import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMPClient, Preference } from '@/lib/mercadopago'
import { z } from 'zod'
import { authError } from '@/lib/api-error'

const bodySchema = z.object({
  analysisId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) return authError()

    const body = await request.json()
    const { analysisId } = bodySchema.parse(body)

    const { data: analysis, error: fetchErr } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    const analysisData = analysis as any
    if (analysisData.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'Este análisis ya fue pagado o no requiere pago' }, { status: 400 })
    }

    const recoverable = analysisData.recoverable_amount ?? 0
    const amount = Math.round(recoverable * 0.2)

    if (amount <= 0) {
      await supabase.from('analyses').update({ status: 'completed' }).eq('id', analysisId).eq('user_id', user.id)
      return NextResponse.json({ unlocked: true, message: 'Sin monto a pagar. Reporte desbloqueado.' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const externalRef = `unlock_${analysisId}`

    const mpClient = getMPClient()
    const preference = new Preference(mpClient)

    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: 'unlock-report',
            title: 'CobroDetector · Desbloquear Reporte (Plan Platino)',
            description: `20% de $${recoverable.toLocaleString('es-CL')} recuperado — ${analysisData.file_name}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'CLP',
          },
        ],
        payer: {
          email: profile?.email ?? user.email ?? '',
          name: profile?.full_name ?? '',
        },
        back_urls: {
          success: `${appUrl}/historial/${analysisId}`,
          failure: `${appUrl}/historial/${analysisId}`,
          pending: `${appUrl}/historial/${analysisId}`,
        },
        auto_return: 'approved',
        external_reference: externalRef,
        notification_url: `${appUrl}/api/payments/webhook`,
        statement_descriptor: 'COBRO DETECTOR',
        metadata: {
          analysis_id: analysisId,
          user_id: user.id,
          type: 'unlock_report',
        },
      },
    })

    return NextResponse.json({
      initPoint: preferenceData.init_point,
      sandboxInitPoint: preferenceData.sandbox_init_point,
      amount,
    })
  } catch (err) {
    console.error('Error en unlock-report:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
