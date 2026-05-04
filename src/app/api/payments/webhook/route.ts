import { NextRequest, NextResponse } from 'next/server'
import { getMPClient, Payment } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'
import { verifyMercadoPagoWebhook } from '@/lib/security'

// Mercado Pago envía notificaciones IPN a este endpoint
// Docs: https://www.mercadopago.cl/developers/es/docs/notifications/ipn/introduction

export async function POST(request: NextRequest) {
  try {
    // Obtener body crudo para verificar firma
    const rawBody = await request.text()
    
    // Verificar firma del webhook (OBLIGATORIO en producción)
    const signature = request.headers.get('x-signature')
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    
    // En producción, el secret debe estar configurado y la firma debe ser válida
    if (process.env.NODE_ENV === 'production') {
      if (!webhookSecret) {
        console.error('❌ Webhook MP: MERCADOPAGO_WEBHOOK_SECRET no configurado en producción')
        return NextResponse.json({ received: false, error: 'Webhook secret not configured' }, { status: 500 })
      }
      
      if (!signature) {
        console.error('Webhook MP: falta header x-signature en producción')
        return NextResponse.json({ received: false, error: 'Falta firma' }, { status: 401 })
      }
      
      const isValid = verifyMercadoPagoWebhook(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Webhook MP: firma inválida')
        return NextResponse.json({ received: false, error: 'Firma inválida' }, { status: 401 })
      }
    } else {
      // En desarrollo, permitir si no hay secret configurado
      if (webhookSecret && signature) {
        const isValid = verifyMercadoPagoWebhook(rawBody, signature, webhookSecret)
        if (!isValid) {
          console.warn('⚠️ Webhook MP: firma inválida (desarrollo)')
          return NextResponse.json({ received: false, error: 'Firma inválida' }, { status: 401 })
        }
      } else if (!webhookSecret) {
        console.warn('⚠️ Webhook MP: verificación desactivada (sin MERCADOPAGO_WEBHOOK_SECRET)')
      }
    }
    
    const body = JSON.parse(rawBody)
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
      const { data: successCharge } = await (supabase as any)
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
          console.log(`✅ Cargo por éxito aprobado: ${successCharge.charge_amount} CLP para usuario ${successCharge.user_id}`)
        }
      }
    } else {
      // Es una orden de compra de créditos
      const { data: order } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('id', externalRef)
        .single()

      if (!order) {
        console.error('Webhook: orden no encontrada', externalRef)
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
      }

      const typedOrder = order as any

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
      if (status === 'approved' && typedOrder.status !== 'paid') {
        const { data: credits } = await (supabase as any)
          .from('credits')
          .select('*')
          .eq('user_id', order.user_id)
          .single()

        if (credits) {
          await (supabase as any)
            .from('credits')
            .update({ total: credits.total + order.credits_purchased })
            .eq('user_id', order.user_id)
        } else {
          // Primera compra (no debería pasar si el trigger funcionó)
          await (supabase as any)
            .from('credits')
            .insert({ user_id: order.user_id, total: order.credits_purchased, used: 0 })
        }

        // Si es plan de éxito, activarlo
        if (order.plan === 'success_fee') {
          await (supabase as any)
            .from('orders')
            .update({ success_plan_active: true })
            .eq('id', externalRef)
        }

        console.log(`✅ Pago aprobado: orden ${externalRef}, +${order.credits_purchased} créditos para usuario ${order.user_id}`)
      }
    }

    return NextResponse.json({ received: true, status })

  } catch (err) {
    console.error('Webhook MP error:', err)
    // Retornamos 200 limpio para evitar que MP reintente
    return NextResponse.json({ received: true })
  }
}

// MP también envía GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ ok: true, service: 'cobro-detector-webhook' })
}
