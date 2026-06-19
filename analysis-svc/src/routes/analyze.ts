import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createServiceClient } from '../infrastructure/adapters/supabase-client.js'
import { CompositeParserAdapter } from '../infrastructure/adapters/composite-parser.adapter.js'
import { GroqAiAdapter } from '../infrastructure/adapters/groq-ai.adapter.js'
import { CircuitBreakerAiAdapter } from '../infrastructure/adapters/circuit-breaker-ai.adapter.js'
import { SupabaseAnalysisRepository } from '../infrastructure/adapters/supabase-analysis.repository.js'
import { PipelineService } from '../domain/pipeline.service.js'
import { RunAnalysisUseCase } from '../application/run-analysis.use-case.js'

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
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return reply.status(404).send({ error: 'Analysis not found' })
    }
    return reply.send(data)
  })

  app.post('/v1/analyze', async (request, reply) => {
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
    const fileUrl = analysis.file_url as string
    const fileType = analysis.file_type as string
    const fileName = analysis.file_name as string

    try {
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`Error downloading file: ${response.statusText}`)
      const buffer = Buffer.from(await response.arrayBuffer())

      const result = await runAnalysis.executeSync(userId, analysisId, buffer, fileType, fileName, false)

      return reply.send({
        analysisId,
        status: 'completed',
        totalTransactions: result.totalTransactions,
        anomaliesCount: result.anomaliesCount,
        recoverableAmount: result.recoverableAmount,
        summary: result.summary,
        bank: result.bank,
      })
    } catch (error) {
      await analysisRepo.markError(analysisId, userId)
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ analysisId, status: 'failed', error: message })
    }
  })
}
