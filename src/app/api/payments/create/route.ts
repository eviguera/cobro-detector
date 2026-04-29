import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMPClient, Preference } from '@/lib/mercadopago'
import { PLANS } from '@/lib/plans'
import { z } from 'zod'

const bodySchema = z.object({
  planKey: z.enum(['starter', 'professional', 'enterprise']),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Validar body
    const body = await request.json()
    const { planKey } = bodySchema.parse(body)

    const plan = PLANS.find(p => p.key === planKey)
    if (!plan) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // 3. Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    // 4. Crear orden pendiente en DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        plan: planKey,
        credits_purchased: plan.credits,
        amount_clp: plan.price,
        status: 'pending',
        payment_provider: 'mercadopago',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creando orden:', orderError)
      return NextResponse.json({ error: 'Error creando la orden' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // 5. Crear preferencia en Mercado Pago
    const mpClient = getMPClient()
    const preference = new Preference(mpClient)

    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: planKey,
            title: `CobroDetector · Plan ${plan.name}`,
            description: `${plan.credits} créditos de análisis de estado de cuenta`,
            quantity: 1,
            unit_price: plan.price,
            currency_id: 'CLP',
          },
        ],
        payer: {
          email: profile?.email ?? user.email ?? '',
          name: profile?.full_name ?? '',
        },
        back_urls: {
          success: `${appUrl}/pago/exitoso?order=${order.id}`,
          failure: `${appUrl}/pago/fallido?order=${order.id}`,
          pending: `${appUrl}/pago/exitoso?order=${order.id}&pending=true`,
        },
        auto_return: 'approved',
        external_reference: order.id, // nuestro ID de orden para el webhook
        notification_url: `${appUrl}/api/payments/webhook`,
        statement_descriptor: 'COBRO DETECTOR',
        expires: false,
        metadata: {
          order_id: order.id,
          user_id: user.id,
          plan_key: planKey,
          credits: plan.credits,
        },
      },
    })

    // 6. Guardar preference_id en la orden
    await supabase
      .from('orders')
      .update({ mp_preference_id: preferenceData.id })
      .eq('id', order.id)

    return NextResponse.json({
      orderId: order.id,
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,        // URL de producción
      sandboxInitPoint: preferenceData.sandbox_init_point, // URL de sandbox
    })

  } catch (err) {
    console.error('Error creando preferencia MP:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
