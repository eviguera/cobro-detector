import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { PLANS } from '@/lib/plans'
import { z } from 'zod'
import { authError, handleApiError, successResponse } from '@/lib/api-error'

const bodySchema = z.object({
  planKey: z.enum(['inicial', 'plus', 'contador', 'platino']),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    
    if (authErr || !user) {
      return authError()
    }

    // 2. Validar body
    const body = await request.json()
    const { planKey } = bodySchema.parse(body)

    const plan = PLANS.find(p => p.key === planKey)
    if (!plan) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // 3. Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return handleApiError(profileError, 'POST /api/payments/create - get profile')
    }

    // 4. Crear orden pendiente en DB
    const orderData = {
      user_id: user.id,
      plan: planKey,
      credits_purchased: plan.credits,
      amount_clp: plan.price,
      status: 'pending',
      payment_provider: 'mercadopago',
    }

    // Plan Platino: ilimitado, se cobra el 20% de lo recuperado
    if (planKey === 'platino') {
      orderData.credits_purchased = 999999
      orderData.amount_clp = 0
      orderData.payment_provider = 'success_fee'
      Object.assign(orderData, { fee_percentage: plan.percentage ?? 20 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError || !order) {
      return handleApiError(orderError, 'POST /api/payments/create - create order')
    }

    // Plan Platino: no necesita preferencia de Mercado Pago
    if (planKey === 'platino') {
      return successResponse({
        orderId: order.id,
        message: 'Plan de éxito activado. Se cobrará el 10% de lo recuperado.',
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // 5. Crear preferencia en Mercado Pago
    const { initPoint, sandboxInitPoint, preferenceId } = await createPaymentPreference({
      items: [
        {
          id: planKey,
          title: `CobroDetector · Plan ${plan.name}`,
          description: `${plan.credits} créditos de análisis de estado de cuenta`,
          quantity: 1,
          unit_price: plan.price,
        },
      ],
      payer: {
        email: profile?.email ?? user.email ?? '',
        name: profile?.full_name ?? '',
      },
      backUrls: {
        success: `${appUrl}/pago/exitoso?order=${order.id}`,
        failure: `${appUrl}/pago/fallido?order=${order.id}`,
        pending: `${appUrl}/pago/exitoso?order=${order.id}&pending=true`,
      },
      externalReference: order.id,
      metadata: {
        order_id: order.id,
        user_id: user.id,
        plan_key: planKey,
        credits: plan.credits,
      },
      appUrl,
    })

    // 6. Guardar preference_id en la orden
    const { error: updateError } = await supabase
      .from('orders')
      .update({ mp_preference_id: preferenceId })
      .eq('id', order.id)

    if (updateError) {
      return handleApiError(updateError, 'POST /api/payments/create - update order')
    }

    return successResponse({
      orderId: order.id,
      preferenceId,
      initPoint,
      sandboxInitPoint,
    })

  } catch (err) {
    return handleApiError(err, 'POST /api/payments/create')
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    
    if (authErr || !user) {
      return authError()
    }

    // Obtener orden por ID
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order')
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID requerido' }, { status: 400 })
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (error || !order) {
      return handleApiError(error, 'GET /api/payments/create - get order')
    }

    return successResponse({ order })

  } catch (err) {
    return handleApiError(err, 'GET /api/payments/create')
  }
}
