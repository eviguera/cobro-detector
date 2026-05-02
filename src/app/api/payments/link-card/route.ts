import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMPClient, Customer, CardToken } from '@/lib/mercadopago'
import { z } from 'zod'

const linkCardSchema = z.object({
  cardToken: z.string().min(10, 'Token de tarjeta inválido'),
  lastFourDigits: z.string().length(4),
  cardBrand: z.string().min(1),
  expiresMonth: z.number().min(1).max(12),
  expiresYear: z.number().min(2024),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = linkCardSchema.parse(body)

    // Obtener o crear cliente en MP
    const mpClient = getMPClient()
    const customerClient = new Customer(mpClient)

    let mpCustomerId: string | null = null

    // Buscar si el usuario ya tiene un customer en MP
    const { data: existingPaymentMethod } = await (supabase as any)
      .from('payment_methods')
      .select('mp_customer_id')
      .eq('user_id', user.id)
      .not('mp_customer_id', 'is', null)
      .limit(1)
      .single()

    if (existingPaymentMethod?.mp_customer_id) {
      mpCustomerId = existingPaymentMethod.mp_customer_id
    } else {
      // Obtener email del usuario
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()

      const email = profile?.email ?? user.email ?? ''

      try {
        // Crear customer en MP
        const customer = await customerClient.create({
          body: {
            email,
            first_name: profile?.full_name?.split(' ')[0] ?? 'Usuario',
            last_name: profile?.full_name?.split(' ').slice(1).join(' ') ?? '',
          }
        })
        mpCustomerId = customer.id as string
      } catch {
        // Si el customer ya existe, buscarlo por email
        const customers = await customerClient.search({
          options: { email }
        })
        if (customers.results && customers.results.length > 0) {
          mpCustomerId = customers.results[0].id as string
        }
      }
    }

    // Guardar método de pago en DB
    const { data: paymentMethod, error } = await (supabase as any)
      .from('payment_methods')
      .insert({
        user_id: user.id,
        mp_card_token: validated.cardToken,
        mp_customer_id: mpCustomerId,
        last_four_digits: validated.lastFourDigits,
        card_brand: validated.cardBrand,
        expires_month: validated.expiresMonth,
        expires_year: validated.expiresYear,
        is_default: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error guardando método de pago:', error)
      return NextResponse.json({ error: 'Error guardando tarjeta' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        lastFourDigits: validated.lastFourDigits,
        cardBrand: validated.cardBrand,
        expiresMonth: validated.expiresMonth,
        expiresYear: validated.expiresYear,
      }
    })

  } catch (err) {
    console.error('Error vinculando tarjeta:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
