import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SupabaseApiKeyRepository } from '../infrastructure/supabase-api-key-repository.js'
import { createServiceClient } from '../infrastructure/supabase-client.js'
import { VerifyKeyUseCase } from '../application/verify-key.use-case.js'

let supabase: ReturnType<typeof createServiceClient> | null = null
let keyRepo: SupabaseApiKeyRepository | null = null

function getRepo() {
  if (!supabase) {
    supabase = createServiceClient()
    keyRepo = new SupabaseApiKeyRepository(supabase)
  }
  return keyRepo!
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/verify', async (request, reply) => {
    const schema = z.object({
      apiKey: z.string().min(1),
    })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    const useCase = new VerifyKeyUseCase(getRepo())
    const result = await useCase.execute(parsed.data.apiKey)

    if (!result.authenticated) {
      return reply.status(401).send({ authenticated: false })
    }

    return reply.send(result)
  })

  app.get('/v1/keys/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const keys = await getRepo().findByUserId(userId)
    return reply.send(keys.map(k => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      permissions: k.permissions,
      is_active: k.is_active,
      expires_at: k.expires_at,
      created_at: k.created_at,
    })))
  })
}
