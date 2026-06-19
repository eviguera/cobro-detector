import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { MercadoPagoGatewayAdapter } from '../infrastructure/adapters/mercadopago-gateway.adapter.js'
import { SupabaseOrderRepositoryAdapter } from '../infrastructure/adapters/supabase-order-repository.adapter.js'
import { SupabaseCreditRepositoryAdapter } from '../infrastructure/adapters/supabase-credit-repository.adapter.js'
import { CreatePaymentUseCase, CreateUnlockPaymentUseCase } from '../application/create-payment.use-case.js'
import { ProcessWebhookUseCase } from '../application/process-webhook.use-case.js'

const supabase = createServiceClient()
const paymentGateway = new MercadoPagoGatewayAdapter()
const orderRepo = new SupabaseOrderRepositoryAdapter(supabase)
const creditRepo = new SupabaseCreditRepositoryAdapter(supabase)
const createPayment = new CreatePaymentUseCase(paymentGateway, orderRepo, creditRepo)
const createUnlockPayment = new CreateUnlockPaymentUseCase(paymentGateway)
const processWebhook = new ProcessWebhookUseCase(paymentGateway, orderRepo, creditRepo)

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
  app.post('/v1/preferences', async (request, reply) => {
    const parsed = preferenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    try {
      const result = await createPayment.execute(parsed.data)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.post('/v1/webhook', async (request, reply) => {
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    const signature = (request.headers['x-signature'] as string) ?? null

    try {
      const result = await processWebhook.execute(rawBody, signature)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.post('/v1/unlock', async (request, reply) => {
    const parsed = unlockSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    try {
      const result = await createUnlockPayment.execute(parsed.data)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(400).send({ error: message })
    }
  })

  app.get('/v1/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await orderRepo.findById(id)

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' })
    }
    return reply.send(order)
  })
}
