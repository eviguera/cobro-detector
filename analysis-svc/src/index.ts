import Fastify from 'fastify'
import cors from '@fastify/cors'
import crypto from 'node:crypto'
import * as Sentry from '@sentry/node'
import { analyzeRoutes } from './routes/analyze.js'
import { healthRoutes } from './routes/health.js'
import { createServiceClient } from './infrastructure/adapters/supabase-client.js'
import { CompositeParserAdapter } from './infrastructure/adapters/composite-parser.adapter.js'
import { GroqAiAdapter } from './infrastructure/adapters/groq-ai.adapter.js'
import { CircuitBreakerAiAdapter } from './infrastructure/adapters/circuit-breaker-ai.adapter.js'
import { SupabaseAnalysisRepository } from './infrastructure/adapters/supabase-analysis.repository.js'
import { PipelineService } from './domain/pipeline.service.js'
import { RunAnalysisUseCase } from './application/run-analysis.use-case.js'
import { queue } from './infrastructure/queue-connection.js'
import { fetchFileFromSupabase } from './security/safe-fetch.js'

// HARDENED (2026-11): Sentry para monitoreo de errores en backend.
// Solo se activa si SENTRY_DSN está configurado (variable de entorno).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '1.0.0',
  })
}

const server = Fastify({ logger: true })

// Orígenes permitidos para las llamadas desde el frontend (Next.js).
// En producción se define CORS_ORIGINS con el dominio de la app.
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins

await server.register(cors, {
  origin: origins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// --- Dependencias compartidas ---
const supabase = createServiceClient()
const parser = new CompositeParserAdapter()
const groqAi = new GroqAiAdapter()
const aiProvider = new CircuitBreakerAiAdapter(groqAi)
const pipeline = new PipelineService(aiProvider, parser)
const analysisRepo = new SupabaseAnalysisRepository(supabase)

// Cola de análisis asíncrono (Redis). Se comparte con las rutas para enqueue.
const runAnalysis = new RunAnalysisUseCase(pipeline, analysisRepo, queue)

// --- Utilidad de descifrado AES-256-GCM ---
const ENC_ALGORITHM = 'aes-256-gcm'

function decryptFileAES256GCM(
  encrypted: Buffer,
  keyBase64: string,
  ivBase64: string,
): Buffer {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = Buffer.from(ivBase64, 'base64')
  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted
}

// --- Worker de cola (background, no bloquea el servidor HTTP) ---
async function processJob(job: {
  userId: string
  fileName: string
  filePath: string
  fileType: string
  companyId: string | null
  analysisId: string
}): Promise<void> {
  // Cargar el análisis para conocer user_id, si es plan Platino y los metadatos de cifrado.
  const { data: analysis, error: loadError } = await supabase
    .from('analyses')
    .select('user_id, status, file_type, file_name, storage_path, encryption_key_iv, encryption_key_base64')
    .eq('id', job.analysisId)
    .single()

  if (loadError || !analysis) {
    server.log.error({ err: loadError, analysisId: job.analysisId }, 'No se pudo cargar el análisis para el worker')
    return
  }

  const userId = analysis.user_id as string
  const isPlatino = analysis.status === 'awaiting_payment'
  const storagePath = analysis.storage_path as string | null
  const encryptionKeyIv = analysis.encryption_key_iv as string | null
  const encryptionKeyBase64 = analysis.encryption_key_base64 as string | null

  await analysisRepo.updateStatus(job.analysisId, userId, 'processing')

  try {
    // Descargar el archivo cifrado desde Supabase Storage (anti-SSRF, con timeout).
    const encryptedBuffer = await fetchFileFromSupabase(job.filePath)

    // Descifrar con AES-256-GCM si hay metadatos de cifrado.
    let buffer: Buffer
    if (encryptionKeyIv && encryptionKeyBase64) {
      buffer = decryptFileAES256GCM(encryptedBuffer, encryptionKeyBase64, encryptionKeyIv)
    } else {
      // Fallback: archivo sin cifrar (retrocompatibilidad con análisis previos).
      buffer = encryptedBuffer
    }

    const result = await pipeline.run(buffer, job.fileType, {
      userId,
      fileName: job.fileName,
    })

    if (result.success === false) {
      throw new Error(result.error || 'El motor de análisis no pudo procesar el archivo')
    }

    const anomalies = result.anomalies ?? []
    if (anomalies.length > 0) {
      const anomaliesToInsert = anomalies.map((anomaly) => ({
        analysis_id: job.analysisId,
        user_id: userId,
        type: anomaly.type as string,
        severity: anomaly.severity as string,
        title: anomaly.title as string,
        description: anomaly.description as string,
        detail: (anomaly.detail as string) ?? null,
        recoverable_amount: anomaly.recoverableAmount as number,
        transaction_refs: anomaly.transactionRefs as string[],
        status: 'pending' as string,
      }))
      await analysisRepo.insertAnomalies(job.analysisId, userId, anomaliesToInsert)
    }

    const recoverableAmount = result.totalRecoverable ?? 0
    const awaitingPayment = isPlatino && recoverableAmount > 0

    await analysisRepo.storeResults(job.analysisId, userId, result as unknown as Parameters<typeof analysisRepo.storeResults>[2], isPlatino)

    // Eliminar el archivo cifrado de Storage tras el procesamiento exitoso.
    if (storagePath) {
      await supabase.storage.from('analysis-files').remove([storagePath])
      await supabase
        .from('analyses')
        .update({ file_deleted_at: new Date().toISOString() })
        .eq('id', job.analysisId)
    }

    server.log.info(
      { analysisId: job.analysisId, userId, anomaliesCount: anomalies.length, recoverableAmount },
      'Análisis completado por worker y archivo eliminado de Storage',
    )
  } catch (error) {
    server.log.error({ err: error, analysisId: job.analysisId }, 'Error procesando análisis en worker')
    await analysisRepo.markError(job.analysisId, userId)
  }
}

async function startQueueWorker(): Promise<void> {
  server.log.info('Iniciando worker de cola de análisis (Redis)')
  while (true) {
    try {
      const job = await queue.dequeue()
      if (!job) continue
      await processJob(job)
    } catch (err) {
      server.log.error({ err }, 'Error en el bucle del worker de cola')
      // Esperar un poco antes de reintentar para no saturar en caso de fallo persistente.
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
}

// El worker se inicia en background (no bloquea el listen del servidor).
startQueueWorker().catch((err) => {
  server.log.error({ err }, 'No se pudo iniciar el worker de cola')
})

await server.register(healthRoutes)
await server.register(analyzeRoutes)

const port = Number(process.env.PORT) || 3001

try {
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Analysis service running on port ${port} (CORS: ${origins.join(', ')})`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
