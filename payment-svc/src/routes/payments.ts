import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { MercadoPagoGatewayAdapter } from '../infrastructure/adapters/mercadopago-gateway.adapter.js'
import { SupabaseOrderRepositoryAdapter } from '../infrastructure/adapters/supabase-order-repository.adapter.js'
import { SupabaseAnalysisRepositoryAdapter } from '../infrastructure/adapters/supabase-analysis-repository.adapter.js'
import { SupabaseCreditRepositoryAdapter } from '../infrastructure/adapters/supabase-credit-repository.adapter.js'
import { CreatePaymentUseCase, CreateUnlockPaymentUseCase } from '../application/create-payment.use-case.js'
import { ProcessWebhookUseCase } from '../application/process-webhook.use-case.js'
import { requireAuth, requireSelfOr403, type AuthUser } from '../security/supabase-jwt.js'

const supabase = createServiceClient()
const paymentGateway = new MercadoPagoGatewayAdapter()
const orderRepo = new SupabaseOrderRepositoryAdapter(supabase)
const analysisRepo = new SupabaseAnalysisRepositoryAdapter(supabase)
const creditRepo = new SupabaseCreditRepositoryAdapter(supabase)
const createPayment = new CreatePaymentUseCase(paymentGateway, orderRepo, creditRepo)
const createUnlockPayment = new CreateUnlockPaymentUseCase(paymentGateway)
const processWebhook = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo, analysisRepo)

const preferenceSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  userName: z.string().nullable(),
  planKey: z.string(),
  appUrl: z.string(),
})

const unlockSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  userName: z.string().nullable(),
  analysisId: z.string(),
  analysisFileName: z.string(),
  recoverableAmount: z.number(),
  appUrl: z.string(),
})

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/v1/preferences', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = preferenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    // HARDENED (2026-11): la identidad SIEMPRE viene del JWT, nunca del body
    // (antes un usuario podía crear preferencias de pago a nombre de otro).
    const user: AuthUser = request.authUser
    const data = {
      ...parsed.data,
      userId: user.id,
      userEmail: user.email || parsed.data.userEmail,
    }

    try {
      const result = await createPayment.execute(data)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.post('/v1/webhook', async (request, reply) => {
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    const signature = (request.headers['x-signature'] as string) ?? null
    // HARDENED (2026-11): MP envía el request-id como HEADER, no en el body.
    const requestId = (request.headers['x-request-id'] as string) ?? undefined

    try {
      const result = await processWebhook.execute(rawBody, signature, requestId)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.post('/v1/unlock', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = unlockSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    // HARDENED (2026-11): identidad del JWT; el análisis debe ser del propio usuario.
    const user: AuthUser = request.authUser
    const data = { ...parsed.data, userId: user.id }

    // El createUnlockPayment adjunta el análisis al pago: valida ownership server-side.
    const { data: analysisRow } = await supabase
      .from('analyses')
      .select('id, user_id')
      .eq('id', data.analysisId)
      .single()
    if (analysisRow && analysisRow.user_id !== user.id) {
      return reply.status(403).send({ error: 'Forbidden: analysis belongs to another user' })
    }

    try {
      const result = await createUnlockPayment.execute(data)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.get('/v1/orders/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await orderRepo.findById(id)

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    // HARDENED (2026-11): solo el dueño de la orden puede verla.
    const ok = await requireSelfOr403(request, reply, order.user_id)
    if (!ok) return reply
    return reply.send(order)
  })
}
