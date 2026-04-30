import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chargeSuccessFee } from '@/lib/mercadopago'
import type { SuccessChargeStatus } from '@/types/database.types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const anomalyId = params.id
    const body = await request.json()
    const { status, recoveredAmount } = body

    // Validar que el estado sea válido
    if (!['pending', 'claimed', 'recovered', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Obtener la anomalía actual
    const { data: anomaly, error: fetchError } = await (supabase as any)
      .from('anomalies')
      .select('*, analyses!inner(user_id, recoverable_amount)')
      .eq('id', anomalyId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !anomaly) {
      return NextResponse.json({ error: 'Anomalía no encontrada' }, { status: 404 })
    }

    // Si se marca como recuperada y el usuario tiene plan de éxito activo
    if (status === 'recovered' && (anomaly as any).status !== 'recovered') {
      // Verificar si el usuario tiene plan de éxito activo
      const { data: activeOrder } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan', 'success_fee')
        .eq('status', 'paid')
        .eq('success_plan_active', true)
        .single()

      if (activeOrder) {
          // Obtener método de pago del usuario
          const { data: paymentMethod } = await (supabase as any)
            .from('payment_methods')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single()

          if (paymentMethod) {
            const amountToCharge = recoveredAmount || (anomaly as any).recoverable_amount
            const feeAmount = Math.round(amountToCharge * ((activeOrder as any).fee_percentage || 10) / 100)

            // Crear registro de cargo pendiente
            const { data: successCharge, error: chargeError } = await (supabase as any)
              .from('success_charges')
              .insert({
                user_id: user.id,
                anomaly_id: anomalyId,
                analysis_id: (anomaly as any).analysis_id,
                recovered_amount: amountToCharge,
                fee_percentage: (activeOrder as any).fee_percentage || 10,
                charge_amount: feeAmount,
                status: 'pending' as SuccessChargeStatus,
              })
              .select()
              .single()

          if (chargeError || !successCharge) {
            console.error('Error creando registro de cargo:', chargeError)
            return NextResponse.json({ error: 'Error procesando cobro' }, { status: 500 })
          }

          try {
            // Realizar cobro con MP
            const payment = await chargeSuccessFee(
              (paymentMethod as any).mp_card_token,
              feeAmount,
              `CobroDetector - 10% de recuperación (${(anomaly as any).title})`,
              successCharge.id
            )

            // Actualizar estado del cargo
            await (supabase as any)
              .from('success_charges')
              .update({
                status: payment.status === 'approved' ? 'charged' as SuccessChargeStatus : 'failed' as SuccessChargeStatus,
                mp_payment_id: String(payment.id),
                mp_status: payment.status,
                mp_detail: payment.status_detail,
                charged_at: payment.status === 'approved' ? new Date().toISOString() : null,
              })
              .eq('id', successCharge.id)

            if (payment.status !== 'approved') {
              return NextResponse.json({
                error: 'El cobro fue rechazado',
                mp_status: payment.status,
                mp_detail: payment.status_detail,
              }, { status: 402 })
            }

          } catch (chargeErr) {
            console.error('Error en cobro MP:', chargeErr)
            // Actualizar estado a fallido
            await (supabase as any)
              .from('success_charges')
              .update({
                status: 'failed' as SuccessChargeStatus,
                mp_detail: String(chargeErr),
              })
              .eq('id', successCharge.id)

            return NextResponse.json({ error: 'Error procesando el cobro' }, { status: 500 })
          }
        }
      }
    }

    // Actualizar anomalía
    const { data: updatedAnomaly, error: updateError } = await (supabase as any)
      .from('anomalies')
      .update({ status })
      .eq('id', anomalyId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error actualizando anomalía' }, { status: 500 })
    }

    return NextResponse.json({ anomaly: updatedAnomaly })

  } catch (err) {
    console.error('Error actualizando anomalía:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
