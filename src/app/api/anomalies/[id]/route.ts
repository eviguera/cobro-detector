import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tables } from '@/lib/supabase/db'
import { chargeSuccessFee } from '@/lib/mercadopago'
import { handleApiError } from '@/lib/api-error'
import type { SuccessChargeStatus, Anomaly, Order, PaymentMethod, SuccessCharge } from '@/types/database.types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const db = tables(supabase)
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

    // @supabase/ssr type inference limitation — all table queries return `never` types.
    // Cast required to unblock .from().select() chaining.
    // Obtener la anomalía actual
    const { data: anomaly, error: fetchError } = await db.anomalies
      .select('*, analyses!inner(user_id, recoverable_amount)')
      .eq('id', anomalyId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !anomaly) {
      return NextResponse.json({ error: 'Anomalía no encontrada' }, { status: 404 })
    }

    const typedAnomaly = anomaly as Anomaly & { analyses: { user_id: string; recoverable_amount: number } }
    const anomalyData = typedAnomaly

    // Si se marca como recuperada y el usuario tiene plan de éxito activo
    if (status === 'recovered' && anomalyData.status !== 'recovered') {
      // Verificar si el usuario tiene plan de éxito activo
      const { data: activeOrder } = await db.orders
        .select('*')
        .eq('user_id', user.id)
        .eq('plan', 'success_fee')
        .eq('status', 'paid')
        .eq('success_plan_active', true)
        .single()

      if (activeOrder) {
          const orderData = activeOrder as Order
          // Obtener método de pago del usuario
          const { data: paymentMethod } = await db.paymentMethods
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single()

          if (paymentMethod) {
            const pmData = paymentMethod as PaymentMethod
            const amountToCharge = recoveredAmount || anomalyData.recoverable_amount
            const feeAmount = Math.round(amountToCharge * (orderData.fee_percentage || 10) / 100)

            // Crear registro de cargo pendiente
            const { data: successCharge, error: chargeError } = await db.successCharges
              .insert({
                user_id: user.id,
                anomaly_id: anomalyId,
                analysis_id: anomalyData.analysis_id,
                recovered_amount: amountToCharge,
                fee_percentage: orderData.fee_percentage || 10,
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
              pmData.mp_card_token,
              feeAmount,
              `CobroDetector - 10% de recuperación (${anomalyData.title})`,
              (successCharge as SuccessCharge).id,
              user.email!,
              pmData.card_brand?.toLowerCase()
            )

            // Actualizar estado del cargo
            await db.successCharges
              .update({
                status: payment.status === 'approved' ? 'charged' as SuccessChargeStatus : 'failed' as SuccessChargeStatus,
                mp_payment_id: String(payment.id),
                mp_status: payment.status,
                mp_detail: payment.status_detail,
                charged_at: payment.status === 'approved' ? new Date().toISOString() : null,
              })
              .eq('id', (successCharge as SuccessCharge).id)

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
            await db.successCharges
              .update({
                status: 'failed' as SuccessChargeStatus,
                mp_detail: String(chargeErr),
              })
              .eq('id', (successCharge as SuccessCharge).id)

            return NextResponse.json({ error: 'Error procesando el cobro' }, { status: 500 })
          }
        }
      }
    }

    // Actualizar anomalía
    const { data: updatedAnomaly, error: updateError } = await db.anomalies
      .update({ status })
      .eq('id', anomalyId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error actualizando anomalía' }, { status: 500 })
    }

    return NextResponse.json({ anomaly: updatedAnomaly })

  } catch (err) {
    return handleApiError(err, 'PATCH /api/anomalies/[id]')
  }
}
