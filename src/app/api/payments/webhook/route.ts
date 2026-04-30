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

    const externalRef = payment.external_reference
    const status = payment.status           // approved | pending | rejected
    const statusDetail = payment.status_detail

    if (!externalRef) {
      console.error('Webhook: sin external_reference en pago', paymentId)
      return NextResponse.json({ error: 'Sin referencia externa' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar si es un cargo por éxito (UUID de success_charges) o una orden normal
    const isSuccessCharge = externalRef.length > 30 // Los UUIDs de success_charges son largos

    if (isSuccessCharge) {
      // Es un cargo por éxito
      const { data: successCharge } = await supabase
        .from('success_charges')
        .select('*')
        .eq('id', externalRef)
        .single()

      if (successCharge) {
        await (supabase as any)
          .from('success_charges')
          .update({
            status: status === 'approved' ? 'charged' : status === 'rejected' ? 'failed' : 'pending',
            mp_payment_id: String(paymentId),
            mp_status: status ?? null,
            mp_detail: statusDetail ?? null,
            charged_at: status === 'approved' ? new Date().toISOString() : null,
          })
          .eq('id', externalRef)

        if (status === 'approved') {
          console.log(`✅ Cargo por éxito aprobado: ${(successCharge as any).charge_amount} CLP para usuario ${(successCharge as any).user_id}`)
        }
      }
    } else {
      // Es una orden de compra de créditos
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', externalRef)
        .single()

      if (!order) {
        console.error('Webhook: orden no encontrada', externalRef)
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
      }

      // Actualizar estado de la orden
      await (supabase as any)
        .from('orders')
        .update({
          status: status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending',
          mp_payment_id: String(paymentId),
          mp_status: status ?? null,
          mp_detail: statusDetail ?? null,
          payment_reference: String(paymentId),
        })
        .eq('id', externalRef)

      // Si el pago fue aprobado → acreditar créditos al usuario
      if (status === 'approved' && (order as any).status !== 'paid') {
        const { data: credits } = await (supabase as any)
          .from('credits')
          .select('*')
          .eq('user_id', (order as any).user_id)
          .single()

        if (credits) {
          await (supabase as any)
            .from('credits')
            .update({ total: (credits as any).total + (order as any).credits_purchased })
            .eq('user_id', (order as any).user_id)
        } else {
          // Primera compra (no debería pasar si el trigger funcionó)
          await (supabase as any)
            .from('credits')
            .insert({ user_id: (order as any).user_id, total: (order as any).credits_purchased, used: 0 })
        }

        // Si es plan de éxito, activarlo
        if ((order as any).plan === 'success_fee') {
          await (supabase as any)
            .from('orders')
            .update({ success_plan_active: true })
            .eq('id', externalRef)
        }

        console.log(`✅ Pago aprobado: orden ${externalRef}, +${(order as any).credits_purchased} créditos para usuario ${(order as any).user_id}`)
      }
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
