import { describe, it, expect, vi } from 'vitest'
import type { Logger } from 'pino'
import { QueueWorker } from './queue-worker.js'
import { TransientJobError, type AnalysisJobProcessor } from './analysis-job.processor.js'
import type { ClaimedJob, QueueEnvelope, QueueJob, ReliableAnalysisQueue } from '../domain/ports/queue.port.js'

/**
 * Cola en memoria que implementa el contrato ReliableAnalysisQueue.
 * Reproduce la semántica del adapter Redis (claim mueve a processing, ack
 * elimina, retry reencola o manda a la DLQ, 'gone' si ya no estaba) para
 * probar el estado del worker.
 */
class InMemoryReliableQueue implements ReliableAnalysisQueue {
  queue: QueueEnvelope[] = []
  processing: QueueEnvelope[] = []
  dead: QueueEnvelope[] = []
  touchCalls = 0

  async enqueue(job: QueueJob): Promise<void> {
    this.queue.push({ id: `job-${job.analysisId}`, attempts: 0, enqueuedAt: Date.now(), job })
  }

  async claim(): Promise<ClaimedJob | null> {
    const envelope = this.queue.shift()
    if (!envelope) return null
    this.processing.push(envelope)
    return { envelope, raw: JSON.stringify(envelope) }
  }

  async ack(claimed: ClaimedJob): Promise<void> {
    this.processing = this.processing.filter((e) => e.id !== claimed.envelope.id)
  }

  async retry(claimed: ClaimedJob, maxAttempts: number): Promise<'requeued' | 'dead' | 'gone'> {
    const idx = this.processing.findIndex((e) => e.id === claimed.envelope.id)
    // 'gone': otro worker ya hizo ack (o reencoló) este job.
    if (idx === -1) return 'gone'
    this.processing.splice(idx, 1)
    const requeued: QueueEnvelope = { ...claimed.envelope, attempts: claimed.envelope.attempts + 1 }
    if (requeued.attempts >= maxAttempts) {
      this.dead.push(requeued)
      return 'dead'
    }
    this.queue.push(requeued)
    return 'requeued'
  }

  async reap(staleMs: number, maxAttempts: number): Promise<number> {
    // En memoria todo lo que está en processing se considera huérfano.
    void staleMs
    let requeued = 0
    for (const envelope of [...this.processing]) {
      const outcome = await this.retry({ envelope, raw: JSON.stringify(envelope) }, maxAttempts)
      if (outcome === 'requeued') requeued += 1
    }
    return requeued
  }

  async touch(claimed: ClaimedJob): Promise<void> {
    // Heartbeat: cuenta para poder aseverar que el worker lo emite.
    void claimed
    this.touchCalls += 1
  }

  async getLength(): Promise<number> {
    return this.queue.length
  }

  async getProcessingLength(): Promise<number> {
    return this.processing.length
  }

  async getDeadLength(): Promise<number> {
    return this.dead.length
  }
}

function makeJob(analysisId: string): QueueJob {
  return {
    userId: 'user-1',
    fileName: 'cartola.csv',
    filePath: 'https://supabase.co/storage/analysis-files/x.enc',
    fileType: 'text/csv',
    companyId: null,
    analysisId,
  }
}

function fakeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => fakeLogger()),
  } as unknown as Logger
}

function makeProcessor(impl: (job: QueueJob) => Promise<void>): AnalysisJobProcessor {
  return {
    process: vi.fn(impl),
    // Cierre terminal best-effort: el worker lo llama en la DLQ, nunca debe
    // tumbar el bucle.
    failTerminal: vi.fn(async () => {}),
  } as unknown as AnalysisJobProcessor
}

function makeWorker(queue: InMemoryReliableQueue, processorImpl: (job: QueueJob) => Promise<void>, config: Record<string, number> = {}) {
  const processor = makeProcessor(processorImpl)
  const worker = new QueueWorker({
    queue,
    processor,
    logger: fakeLogger(),
    config: { pollIntervalMs: 1, reapIntervalMs: 1_000_000, ...config },
  })
  return { worker, processor }
}

describe('QueueWorker', () => {
  it('procesa un job y hace ack (sale de processing)', async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-1'))
    const { worker } = makeWorker(queue, async () => {})

    worker.start()
    await vi.waitFor(() => expect(queue.processing).toHaveLength(0))
    await worker.stop()

    expect(await queue.getLength()).toBe(0)
    expect(await queue.getDeadLength()).toBe(0)
  })

  it('reintenta un fallo transitorio y termina en la DLQ al agotar intentos', async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-2'))
    const { worker, processor } = makeWorker(queue, async () => {
      throw new TransientJobError('db caída')
    }, { maxAttempts: 2 })

    // Ejecución inicial (attempts=0) + reintento (attempts=1) → DLQ.
    worker.start()
    await vi.waitFor(() => expect(queue.dead).toHaveLength(1))
    await worker.stop()

    expect(processor.process).toHaveBeenCalledTimes(2)
    expect(queue.dead[0]?.attempts).toBe(2)
    expect(await queue.getLength()).toBe(0)
    // Reintentos agotados sin veredicto: se cierra el análisis para no dejar
    // al usuario en "processing" para siempre.
    expect(processor.failTerminal).toHaveBeenCalledTimes(1)
  })

  it('un error inesperado va a la DLQ y cierra el análisis (failTerminal)', async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-3'))
    // Cualquier error que NO sea TransientJobError es un bug del worker: no
    // se reintenta (podría ser determinista), se manda a la DLQ y se cierra
    // el análisis para el usuario.
    const { worker, processor } = makeWorker(queue, async () => {
      throw new Error('bug inesperado')
    })

    worker.start()
    await vi.waitFor(() => expect(queue.dead).toHaveLength(1))
    await worker.stop()

    expect(processor.process).toHaveBeenCalledTimes(1)
    expect(processor.failTerminal).toHaveBeenCalledTimes(1)
    expect(await queue.getLength()).toBe(0)
    expect(queue.processing).toHaveLength(0)
  })

  it("no hace failTerminal si otro worker ya gestionó el job ('gone')", async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-3b'))
    // Simula la carrera: otro worker hizo ack/reencoló entre nuestro claim y
    // nuestro retry.
    queue.retry = async () => {
      // En Redis, 'gone' implica que el member ya no está en `processing`.
      queue.processing = []
      return 'gone'
    }
    const { worker, processor } = makeWorker(queue, async () => {
      throw new TransientJobError('db caída')
    })

    worker.start()
    await vi.waitFor(() => expect(queue.processing).toHaveLength(0))
    await worker.stop()

    expect(processor.process).toHaveBeenCalledTimes(1)
    expect(processor.failTerminal).not.toHaveBeenCalled()
    expect(await queue.getDeadLength()).toBe(0)
    expect(await queue.getLength()).toBe(0)
  })

  it('emite heartbeat (touch) mientras el job sigue in-flight', async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-3c'))

    let releaseJob!: () => void
    const jobDone = new Promise<void>((resolve) => { releaseJob = resolve })
    // staleMs=3000 → heartbeat cada max(1000, 1000) = 1s.
    const { worker } = makeWorker(queue, async () => { await jobDone }, { staleMs: 3000 })

    worker.start()
    await vi.waitFor(() => expect(worker.currentJobId).not.toBeNull())
    await vi.waitFor(() => expect(queue.touchCalls).toBeGreaterThan(0), { timeout: 3000 })

    releaseJob()
    await worker.stop()

    expect(queue.processing).toHaveLength(0)
  })

  it('stop() espera el job in-flight (apagado elegante)', async () => {
    const queue = new InMemoryReliableQueue()
    await queue.enqueue(makeJob('a-4'))

    // Definite assignment: TS no rastrea la asignación dentro del executor.
    let releaseJob!: () => void
    const jobDone = new Promise<void>((resolve) => { releaseJob = resolve })
    const { worker, processor } = makeWorker(queue, async () => { await jobDone })

    worker.start()
    // Esperar a que el job esté in-flight.
    await vi.waitFor(() => expect(worker.currentJobId).not.toBeNull())

    const stopped = worker.stop()
    // El stop no debe resolver mientras el job siga corriendo.
    await Promise.resolve()
    expect(worker.isRunning).toBe(false)

    releaseJob()
    await stopped

    expect(processor.process).toHaveBeenCalledTimes(1)
    // El job completado tras el stop igualmente se ack-ea.
    expect(queue.processing).toHaveLength(0)
  })

  it('el reaper devuelve jobs huérfanos de workers muertos', async () => {
    const queue = new InMemoryReliableQueue()
    // Simular un worker que murió con el job reclamado.
    await queue.enqueue(makeJob('a-5'))
    const claimed = await queue.claim()
    expect(claimed).not.toBeNull()

    const requeued = await queue.reap(0, 3)
    expect(requeued).toBe(1)
    expect(await queue.getLength()).toBe(1)
    expect(await queue.getProcessingLength()).toBe(0)
  })

  it('no reclama jobs nuevos después del stop', async () => {
    const queue = new InMemoryReliableQueue()
    const { worker } = makeWorker(queue, async () => {})
    worker.start()
    await worker.stop()

    await queue.enqueue(makeJob('a-6'))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(await queue.getLength()).toBe(1)
  })
})
