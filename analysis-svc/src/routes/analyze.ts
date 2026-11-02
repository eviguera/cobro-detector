import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { CompositeParserAdapter } from '../infrastructure/adapters/composite-parser.adapter.js'
import { GroqAiAdapter } from '../infrastructure/adapters/groq-ai.adapter.js'
import { CircuitBreakerAiAdapter } from '../infrastructure/adapters/circuit-breaker-ai.adapter.js'
import { SupabaseAnalysisRepository } from '../infrastructure/adapters/supabase-analysis.repository.js'
import { PipelineService } from '../domain/pipeline.service.js'
import { RunAnalysisUseCase } from '../application/run-analysis.use-case.js'
import { requireAuth, requireSelfOr403 } from '../security/supabase-jwt.js'
import { fetchFileFromSupabase } from '../security/safe-fetch.js'

const supabase = createServiceClient()
const parser = new CompositeParserAdapter()
const groqAi = new GroqAiAdapter()
const aiProvider = new CircuitBreakerAiAdapter(groqAi)
const pipeline = new PipelineService(aiProvider, parser)
const analysisRepo = new SupabaseAnalysisRepository(supabase)
const runAnalysis = new RunAnalysisUseCase(pipeline, analysisRepo, { enqueue: async () => {} })

const analyzeSchema = z.object({
  analysisId: z.string().uuid(),
})

export async function analyzeRoutes(app: FastifyInstance) {
  app.get('/v1/analyses/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // HARDENED (2026-11): auth ANTES de tocar la DB (sin esto, un 404/403
    // filtraria la existencia de analisis de otros usuarios).
    const okAuth = await requireAuth(request, reply)
    if (!okAuth) return reply

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }

    // El analisis debe pertenecer al usuario del token.
    if (request.authUser.id !== data.user_id) {
      return reply.status(403).send({ error: 'Forbidden: resource belongs to another user' })
    }
    return reply.send(data)
  })

  app.post('/v1/analyze', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = analyzeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    const { analysisId } = parsed.data

    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (error || !analysis) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }

    const userId = analysis.user_id as string

    // HARDENED (2026-11): solo se puede ejecutar un análisis propio.
    if (request.authUser.id !== userId) {
      return reply.status(403).send({ error: 'Forbidden: analysis belongs to another user' })
    }

    const fileUrl = analysis.file_url as string
    const fileType = analysis.file_type as string
    const fileName = analysis.file_name as string
    // El frontend marca los análisis Platino con `awaiting_payment` al crearlos.
    // Leerlo antes de ejecutar evita que el plan se pierda al pasar a `processing`.
    const isPlatino = analysis.status === 'awaiting_payment'

    const SAFE_DOWNLOAD_ERRORS = new Set([
      'Invalid file URL',
      'File URL is not allowed',
      'File download timed out',
      'Error downloading the file',
      'File exceeds the maximum allowed size',
      'File download configuration missing',
    ])

    try {
      // HARDENED (2026-11): descarga solo desde Supabase (anti-SSRF), con
      // timeout y límite de tamaño en `security/safe-fetch.ts`.
      const buffer = await fetchFileFromSupabase(fileUrl)

      const result = await runAnalysis.executeSync(userId, analysisId, buffer, fileType, fileName, isPlatino)

      return reply.send({
        analysisId,
        status: result.awaitingPayment ? 'awaiting_payment' : 'completed',
        totalTransactions: result.totalTransactions,
        anomaliesCount: result.anomaliesCount,
        recoverableAmount: result.recoverableAmount,
        summary: result.summary,
        bank: result.bank,
        awaitingPayment: result.awaitingPayment,
        paymentAmount: result.paymentAmount,
      })
    } catch (error) {
      // El detalle crudo va al log del servicio; el cliente recibe solo un
      // mensaje seguro (sin URLs, hosts internos ni stack traces).
      request.log.error({ err: error, analysisId }, 'Analysis processing failed')
      await analysisRepo.markError(analysisId, userId)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const safeMessage = SAFE_DOWNLOAD_ERRORS.has(message) ? message : 'Failed to process the analysis'
      return reply.status(500).send({ analysisId, status: 'failed', error: safeMessage })
    }
  })
}
