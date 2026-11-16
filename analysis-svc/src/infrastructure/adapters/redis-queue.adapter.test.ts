import { describe, it, expect, afterAll, beforeAll, beforeEach } from 'vitest'
import { Redis } from 'ioredis'
import { RedisAnalysisQueue } from './redis-queue.adapter.js'
import type { QueueJob } from '../../domain/ports/queue.port.js'

/**
 * Tests de integración contra Redis REAL (los scripts Lua no son simulables
 * con fidelity). Corren solo si REDIS_TEST_URL está definida:
 *
 *   REDIS_TEST_URL=redis://localhost:6379 npm test
 *
 * En CI el workflow levanta un contenedor Redis y define la variable. Usan
 * claves con prefijo propio y se limpian al final.
 */
const redisUrl = process.env.REDIS_TEST_URL

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

describe.skipIf(!redisUrl)('RedisAnalysisQueue (integración)', () => {
  let redis: Redis
  let queue: RedisAnalysisQueue

  const keys = {
    queue: 'test:analysis:queue',
    processing: 'test:analysis:processing',
    dead: 'test:analysis:dlq',
  }

  beforeAll(async () => {
    redis = new Redis(redisUrl as string)
    queue = new RedisAnalysisQueue(redis, keys)
    await redis.del(...Object.values(keys))
  })

  // Aislamiento total entre tests: un fallo no debe contaminar el siguiente
  // con jobs residuales en las claves compartidas.
  beforeEach(async () => {
    await redis.del(...Object.values(keys))
  })

  afterAll(async () => {
    await redis.del(...Object.values(keys))
    await redis.quit()
  })

  it('enqueue → claim mueve el job a processing (no se pierde si el worker muere)', async () => {
    await queue.enqueue(makeJob('i-1'))

    expect(await queue.getLength()).toBe(1)
    const claimed = await queue.claim()
    expect(claimed).not.toBeNull()
    expect(claimed?.envelope.job.analysisId).toBe('i-1')
    expect(claimed?.envelope.attempts).toBe(0)

    // El job ya no está en la cola pero sigue en processing: recuperable.
    expect(await queue.getLength()).toBe(0)
    expect(await queue.getProcessingLength()).toBe(1)

    await queue.ack(claimed as NonNullable<typeof claimed>)
    expect(await queue.getProcessingLength()).toBe(0)
  })

  it('claim en cola vacía devuelve null', async () => {
    expect(await queue.claim()).toBeNull()
  })

  it('retry reencola con attempts+1; al agotar intentos manda a la DLQ', async () => {
    // maxAttempts = ejecuciones totales permitidas (1ª ejecución incluida).
    await queue.enqueue(makeJob('i-2'))
    const claimed = (await queue.claim())!

    const first = await queue.retry(claimed, 2)
    expect(first).toBe('requeued')
    expect(await queue.getLength()).toBe(1)

    const requeued = (await queue.claim())!
    expect(requeued.envelope.attempts).toBe(1)

    // Segundo fallo: attempts pasa a 2 >= maxAttempts → DLQ.
    const second = await queue.retry(requeued, 2)
    expect(second).toBe('dead')
    expect(await queue.getDeadLength()).toBe(1)
    expect(await queue.getLength()).toBe(0)
  })

  it('reap devuelve a la cola un job huérfano (worker muerto antes del ack)', async () => {
    await queue.enqueue(makeJob('i-3'))
    const claimed = (await queue.claim())!
    void claimed

    // Forzar score viejo para simular un job reclamado hace más de staleMs.
    await redis.zadd(keys.processing, Date.now() - 60_000, claimed.raw)

    const requeued = await queue.reap(30_000, 3)
    expect(requeued).toBe(1)
    expect(await queue.getLength()).toBe(1)
    expect(await queue.getProcessingLength()).toBe(0)

    // El job reaped reintenta: attempts se incrementa (un job que revierte a
    // los workers agota su presupuesto y termina en la DLQ).
    const requeuedJob = (await queue.claim())!
    expect(requeuedJob.envelope.attempts).toBe(claimed.envelope.attempts + 1)
    await queue.ack(requeuedJob)
  })

  it('dos workers no reclaman el mismo job (claim atómico)', async () => {
    const redisA = redis.duplicate()
    const redisB = redis.duplicate()
    const workerA = new RedisAnalysisQueue(redisA, keys)
    const workerB = new RedisAnalysisQueue(redisB, keys)

    await queue.enqueue(makeJob('i-4'))

    const [a, b] = await Promise.all([workerA.claim(), workerB.claim()])
    const claimed = [a, b].filter((c) => c !== null)
    expect(claimed).toHaveLength(1)

    await queue.ack(claimed[0]!)
    await redisA.quit()
    await redisB.quit()
  })
})
