import { NextRequest, NextResponse } from 'next/server'
import { getMPClient, Payment } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'
import { verifyMercadoPagoWebhook } from '@/lib/security'
import type { Database } from '@/types/database.types'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const signature = request.headers.get('x-signature')
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!webhookSecret) {
        console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado en producción')
        return NextResponse.json({ received: false, error: 'Webhook secret not configured' }, { status: 500 })
      }

      if (!signature) {
        return NextResponse.json({ received: false, error: 'Falta firma' }, { status: 401 })
      }

      const isValid = verifyMercadoPagoWebhook(rawBody, signature, webhookSecret)
      if (!isValid) {
        return NextResponse.json({ received: false, error: 'Firma inválida' }, { status: 401 })
      }
    } else {
      if (webhookSecret && signature) {
        const isValid = verifyMercadoPagoWebhook(rawBody, signature, webhookSecret)
        if (!isValid) {
          console.warn('Webhook MP: firma inválida (desarrollo)')
          return NextResponse.json({ received: false, error: 'Firma inválida' }, { status: 401 })
        }
      } else if (!webhookSecret) {
        console.warn('Webhook MP: verificación desactivada (sin MERCADOPAGO_WEBHOOK_SECRET)')
      }
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID faltante' }, { status: 400 })
    }

    const mpClient = getMPClient()
    const paymentClient = new Payment(mpClient)
    const payment = await paymentClient.get({ id: paymentId })

    const externalRef = payment.external_reference
    const status = payment.status
    const statusDetail = payment.status_detail

    if (!externalRef) {
      console.error('Webhook: sin external_reference en pago', paymentId)
      return NextResponse.json({ error: 'Sin referencia externa' }, { status: 400 })
    }

    const supabase = await createClient()

    const isUnlock = externalRef.startsWith('unlock_')
    const isSuccessCharge = externalRef.length > 30

    if (isUnlock) {
      await handleUnlockReport(supabase, externalRef, paymentId, status)
    } else if (isSuccessCharge) {
      await handleSuccessCharge(supabase, externalRef, paymentId, status, statusDetail)
    } else {
      await handleOrderPayment(supabase, externalRef, paymentId, status, statusDetail)
    }

    return NextResponse.json({ received: true, status })

  } catch (err) {
    console.error('Webhook MP error:', err)
    return NextResponse.json({ received: true })
  }
}

async function handleSuccessCharge(
  supabase: Supabase,
  externalRef: string,
  paymentId: string,
  status: string | undefined,
  statusDetail: string | undefined
) {
  const { data: successCharge } = await supabase
    .from('success_charges')
    .select('*')
    .eq('id', externalRef)
    .single()

  if (!successCharge) {
    console.error('Webhook: success_charge no encontrada', externalRef)
    return
  }

  const chargeStatus = status === 'approved' ? 'charged' : status === 'rejected' ? 'failed' : 'pending'

  await supabase
    .from('success_charges')
    .update({
      status: chargeStatus,
      mp_payment_id: String(paymentId),
      mp_status: status ?? null,
      mp_detail: statusDetail ?? null,
      charged_at: status === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', externalRef)

  if (status === 'approved') {
    console.log(`Cargo por éxito aprobado: ${successCharge.charge_amount} CLP para usuario ${successCharge.user_id}`)
  }
}

async function handleOrderPayment(
  supabase: Supabase,
  externalRef: string,
  paymentId: string,
  status: string | undefined,
  statusDetail: string | undefined
) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', externalRef)
    .single()

  if (!order) {
    console.error('Webhook: orden no encontrada', externalRef)
    return
  }

  const orderStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending'

  await supabase
    .from('orders')
    .update({
      status: orderStatus,
      mp_payment_id: String(paymentId),
      mp_status: status ?? null,
      mp_detail: statusDetail ?? null,
      payment_reference: String(paymentId),
    })
    .eq('id', externalRef)

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
      await supabase
        .from('credits')
        .insert({ user_id: order.user_id, total: order.credits_purchased, used: 0 })
    }

    if (order.plan === 'success_fee') {
      await supabase
        .from('orders')
        .update({ success_plan_active: true })
        .eq('id', externalRef)
    }

    console.log(`Pago aprobado: orden ${externalRef}, +${order.credits_purchased} créditos para usuario ${order.user_id}`)
  }
}

async function handleUnlockReport(
  supabase: Supabase,
  externalRef: string,
  paymentId: string,
  status: string | undefined
) {
  const analysisId = externalRef.replace('unlock_', '')

  if (status === 'approved') {
    const { error } = await supabase
      .from('analyses')
      .update({ status: 'completed' })
      .eq('id', analysisId)
      .eq('status', 'awaiting_payment')

    if (error) {
      console.error('Error desbloqueando reporte:', error)
    } else {
      console.log(`Reporte desbloqueado: ${analysisId} (pago ${paymentId})`)
    }
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'cobro-detector-webhook' })
}
