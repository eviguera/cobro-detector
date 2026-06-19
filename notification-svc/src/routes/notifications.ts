import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { ResendEmailAdapter } from '../infrastructure/adapters/resend-email.adapter.js'
import { SupabaseEventRepositoryAdapter } from '../infrastructure/adapters/supabase-event-repository.adapter.js'
import { SendAnalysisNotificationUseCase } from '../application/send-analysis-notification.use-case.js'
import { TrackEventUseCase } from '../application/track-event.use-case.js'

const supabase = createServiceClient()
const emailSender = new ResendEmailAdapter()
const eventRepo = new SupabaseEventRepositoryAdapter(supabase)
const sendNotification = new SendAnalysisNotificationUseCase(emailSender)
const trackEvent = new TrackEventUseCase(eventRepo)

const notificationSchema = z.object({
  to: z.string().email(),
  userName: z.string().min(1),
  analysisId: z.string().uuid(),
  anomaliesCount: z.number().int().nonnegative(),
  recoverableAmount: z.number().nonnegative(),
})

const eventSchema = z.object({
  userId: z.string().nullable(),
  eventType: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
})

export async function notificationRoutes(app: FastifyInstance) {
  app.post('/v1/send-analysis-notification', async (request, reply) => {
    const parsed = notificationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    const sent = await sendNotification.execute(parsed.data)

    return reply.send({ sent })
  })

  app.post('/v1/events', async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    await trackEvent.execute({
      user_id: parsed.data.userId,
      event_type: parsed.data.eventType as never,
      metadata: parsed.data.metadata,
    })

    return reply.send({ tracked: true })
  })
}
