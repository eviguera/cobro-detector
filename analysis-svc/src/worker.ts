import pino from 'pino'
import { createServiceClient } from './infrastructure/adapters/supabase-client.js'
import { CompositeParserAdapter } from './infrastructure/adapters/composite-parser.adapter.js'
import { GroqAiAdapter } from './infrastructure/adapters/groq-ai.adapter.js'
import { CircuitBreakerAiAdapter } from './infrastructure/adapters/circuit-breaker-ai.adapter.js'
import { SupabaseAnalysisRepository } from './infrastructure/adapters/supabase-analysis.repository.js'
import { PipelineService } from './domain/pipeline.service.js'
import { getWorkerQueue } from './infrastructure/queue-connection.js'
import { AnalysisJobProcessor } from './infrastructure/analysis-job.processor.js'
import { QueueWorker } from './infrastructure/queue-worker.js'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  name: 'analysis-worker',
})

function numEnv(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

// --- Dependencias (idénticas a las del servicio HTTP, proceso aparte) ---
const supabase = createServiceClient()
const parser = new CompositeParserAdapter()
const groqAi = new GroqAiAdapter()
const aiProvider = new CircuitBreakerAiAdapter(groqAi)
const pipeline = new PipelineService(aiProvider, parser)
const analysisRepo = new SupabaseAnalysisRepository(supabase)
const processor = new AnalysisJobProcessor({ pipeline, analysisRepo, supabase, logger })

// --- Worker de la cola (claim/ack + reintentos + DLQ + reaper) ---
const worker = new QueueWorker({
  queue: getWorkerQueue(),
  processor,
  logger,
  config: {
    maxAttempts: numEnv('QUEUE_MAX_ATTEMPTS', 3),
    staleMs: numEnv('QUEUE_STALE_SECONDS', 600) * 1000,
    reapIntervalMs: numEnv('QUEUE_REAP_INTERVAL_SECONDS', 60) * 1000,
    pollIntervalMs: numEnv('QUEUE_POLL_INTERVAL_MS', 500),
  },
})

worker.start()

// --- Apagado elegante: SIGTERM/SIGINT terminan el job in-flight y hacen ack ---
const HARD_SHUTDOWN_MS = numEnv('QUEUE_HARD_SHUTDOWN_SECONDS', 30) * 1000

function shutdown(signal: string): void {
  logger.info({ signal, inFlight: worker.currentJobId }, 'Señal recibida, apagando worker')
  // Red de seguridad: si el job in-flight no termina en el presupuesto,
  // el orchestrator (compose/k8s) nos matará de todos modos; salimos con
  // código 1 para que quede rastro del apagado forzado.
  const hardExit = setTimeout(() => {
    logger.error('Shutdown forzado: el job in-flight no terminó a tiempo')
    process.exit(1)
  }, HARD_SHUTDOWN_MS)
  hardExit.unref()

  worker
    .stop()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Error durante el shutdown del worker')
      process.exit(1)
    })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
