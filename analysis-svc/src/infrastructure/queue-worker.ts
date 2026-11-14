import type { Logger } from 'pino'
import type { ClaimedJob, ReliableAnalysisQueue } from '../domain/ports/queue.port.js'
import { TransientJobError, type AnalysisJobProcessor } from './analysis-job.processor.js'

export interface QueueWorkerConfig {
  /** Intentos máximos por job (incluida la primera ejecución). */
  maxAttempts: number
  /** Visibility timeout: un job en `processing` más viejo que esto se considera huérfano. */
  staleMs: number
  /** Frecuencia del reaper. */
  reapIntervalMs: number
  /** Espera cuando la cola está vacía (polling). */
  pollIntervalMs: number
}

export const DEFAULT_WORKER_CONFIG: QueueWorkerConfig = {
  maxAttempts: 3,
  // Debe superar con holgura la duración máxima de un análisis (descarga +
  // descifrado + parseo + IA). Default: 10 minutos.
  staleMs: 10 * 60 * 1000,
  reapIntervalMs: 60 * 1000,
  pollIntervalMs: 500,
}

export interface QueueWorkerDeps {
  queue: ReliableAnalysisQueue
  processor: AnalysisJobProcessor
  logger: Logger
  config?: Partial<QueueWorkerConfig>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Worker de la cola de análisis con patrón claim/ack:
 *
 * - claim → process → ack en el happy path.
 * - `TransientJobError` → retry (reencolado con attempts+1) o DLQ.
 * - Reaper periódico: devuelve a la cola los jobs de workers muertos.
 * - `stop()` es un apagado elegante: deja de reclamar jobs, espera el
 *   in-flight, hace ack y resuelve. Pensado para SIGTERM de k8s/compose.
 */
export class QueueWorker {
  private readonly queue: ReliableAnalysisQueue
  private readonly processor: AnalysisJobProcessor
  private readonly logger: Logger
  private readonly config: QueueWorkerConfig

  private running = false
  private loopPromise: Promise<void> | null = null
  private reapTimer: NodeJS.Timeout | null = null
  private inFlight: ClaimedJob | null = null

  constructor(deps: QueueWorkerDeps) {
    this.queue = deps.queue
    this.processor = deps.processor
    this.logger = deps.logger
    this.config = { ...DEFAULT_WORKER_CONFIG, ...deps.config }
  }

  /** Id del job en ejecución (para observabilidad/health). */
  get currentJobId(): string | null {
    return this.inFlight?.envelope.id ?? null
  }

  get isRunning(): boolean {
    return this.running
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info(this.config, 'Iniciando worker de cola de análisis (claim/ack + reaper)')

    this.loopPromise = this.loop().catch((err) => {
      this.logger.error({ err }, 'El bucle del worker terminó inesperadamente')
    })

    this.reapTimer = setInterval(() => {
      this.reapOnce().catch((err) => {
        this.logger.error({ err }, 'Error en el reaper de la cola')
      })
    }, this.config.reapIntervalMs)
    this.reapTimer.unref()
  }

  /** Apagado elegante: no reclama más jobs, espera el in-flight y hace ack. */
  async stop(): Promise<void> {
    if (!this.running) return
    this.running = false
    this.logger.info({ inFlight: this.inFlight?.envelope.id ?? null }, 'Deteniendo worker (graceful shutdown)')

    if (this.reapTimer) {
      clearInterval(this.reapTimer)
      this.reapTimer = null
    }
    await this.loopPromise
    this.logger.info('Worker detenido')
  }

  /** Una pasada del reaper: jobs huérfanos vuelven a la cola (o a la DLQ). */
  async reapOnce(): Promise<number> {
    const requeued = await this.queue.reap(this.config.staleMs, this.config.maxAttempts)
    if (requeued > 0) {
      this.logger.warn({ requeued }, 'Reaper: jobs huérfanos devueltos a la cola')
    }
    return requeued
  }

  private async loop(): Promise<void> {
    while (this.running) {
      let claimed: ClaimedJob | null = null
      try {
        claimed = await this.queue.claim()
      } catch (err) {
        this.logger.error({ err }, 'No se pudo reclamar job de la cola (¿Redis caído?)')
        await sleep(this.config.pollIntervalMs * 4)
        continue
      }

      if (!claimed) {
        await sleep(this.config.pollIntervalMs)
        continue
      }

      this.inFlight = claimed
      try {
        await this.handle(claimed)
      } finally {
        this.inFlight = null
      }
    }
  }

  private async handle(claimed: ClaimedJob): Promise<void> {
    const { envelope } = claimed

    // Heartbeat anti-reaper: mientras el job siga vivo, refrescamos su score
    // en `processing` para que el reaper no lo considere huérfano. Un job que
    // legítimamente dura más que staleMs ya no se duplica.
    const heartbeat = setInterval(() => {
      this.queue.touch(claimed).catch((err) => {
        this.logger.warn({ err, jobId: envelope.id }, 'Heartbeat falló (¿Redis?)')
      })
    }, Math.max(1_000, Math.floor(this.config.staleMs / 3)))
    heartbeat.unref()

    try {
      await this.processor.process(envelope.job)
      await this.queue.ack(claimed)
      return
    } catch (err) {
      if (!(err instanceof TransientJobError)) {
        // Error inesperado del propio worker (bug): a la DLQ para
        // investigación + cierre terminal best-effort para el usuario.
        this.logger.error(
          { err, jobId: envelope.id, analysisId: envelope.job.analysisId, attempts: envelope.attempts },
          'Error no transitorio en el worker: job a la DLQ',
        )
        await this.queue.retry(claimed, 1)
        await this.processor.failTerminal(envelope.job)
        return
      }

      const outcome = await this.queue.retry(claimed, this.config.maxAttempts)
      if (outcome === 'gone') {
        // Otro worker hizo ack (o lo reencoló) mientras reintentábamos:
        // ya está gestionado, nada que hacer.
        this.logger.info({ jobId: envelope.id }, 'Job ya gestionado por otro worker (gone)')
        return
      }
      if (outcome === 'dead') {
        this.logger.error(
          { jobId: envelope.id, analysisId: envelope.job.analysisId, attempts: envelope.attempts + 1 },
          'Job enviado a la DLQ tras agotar reintentos',
        )
        // Reintentos agotados sin veredicto: cerrar el análisis para no dejar
        // al usuario en "processing" para siempre.
        await this.processor.failTerminal(envelope.job)
        return
      }
      this.logger.warn(
        { jobId: envelope.id, analysisId: envelope.job.analysisId, attempts: envelope.attempts + 1, err },
        'Job reencolado (fallo transitorio)',
      )
    } finally {
      clearInterval(heartbeat)
    }
  }
}
