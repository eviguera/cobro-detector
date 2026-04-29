import { NextRequest, NextResponse } from 'next/server'
import { getMPClient, Payment } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'

// Mercado Pago envía notificaciones IPN a este endpoint
// Docs: https://www.mercadopago.cl/developers/es/docs/notifications/ipn/introduction

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Solo procesamos notificaciones de pagos
    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID faltante' }, { status: 400 })
    }

    // Obtener detalles del pago desde MP
    const mpClient = getMPClient()
    const paymentClient = new Payment(mpClient)
    const payment = await paymentClient.get({ id: paymentId })

    const orderId = payment.external_reference
    const status = payment.status           // approved | pending | rejected
    const statusDetail = payment.status_detail

    if (!orderId) {
      console.error('Webhook: sin external_reference en pago', paymentId)
      return NextResponse.json({ error: 'Sin referencia de orden' }, { status: 400 })
    }

    const supabase = await createClient()

    // Buscar la orden
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) {
      console.error('Webhook: orden no encontrada', orderId)
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Actualizar estado de la orden
    await supabase
      .from('orders')
      .update({
        status: status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending',
        mp_payment_id: String(paymentId),
        mp_status: status ?? null,
        mp_detail: statusDetail ?? null,
        payment_reference: String(paymentId),
      })
      .eq('id', orderId)

    // Si el pago fue aprobado → acreditar créditos al usuario
    if (status === 'approved' && order.status !== 'paid') {
      const { data: credits } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', order.user_id)
        .single()

      if (credits) {
        await supabase
          .from('credits')
          .update({ total: credits.total + order.credits_purchased })
          .eq('user_id', order.user_id)
      } else {
        // Primera compra (no debería pasar si el trigger funcionó)
        await supabase
          .from('credits')
          .insert({ user_id: order.user_id, total: order.credits_purchased, used: 0 })
      }

      console.log(`✅ Pago aprobado: orden ${orderId}, +${order.credits_purchased} créditos para usuario ${order.user_id}`)
    }

    return NextResponse.json({ received: true, status })

  } catch (err) {
    console.error('Webhook MP error:', err)
    // Retornamos 200 para evitar que MP reintente indefinidamente
    return NextResponse.json({ received: true, error: String(err) })
  }
}

// MP también envía GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ ok: true, service: 'cobro-detector-webhook' })
}
