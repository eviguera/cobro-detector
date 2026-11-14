import { Redis } from 'ioredis'
import { RedisAnalysisQueue } from './adapters/redis-queue.adapter.js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

// Conexiones LAZY: el proceso worker (src/worker.ts) solo materializa la suya.
// Si fueran constantes, cada worker abriría también la conexión del HTTP
// sin usarla.
let httpRedis: Redis | null = null
let httpQueue: RedisAnalysisQueue | null = null
let workerRedis: Redis | null = null
let workerQueue: RedisAnalysisQueue | null = null

/** Conexión Redis del proceso HTTP (enqueue + health check). */
export function getRedis(): Redis {
  if (!httpRedis) httpRedis = new Redis(redisUrl)
  return httpRedis
}

/** Cola vista por las rutas HTTP y el health check (enqueue + métricas). */
export function getQueue(): RedisAnalysisQueue {
  if (!httpQueue) httpQueue = new RedisAnalysisQueue(getRedis())
  return httpQueue
}

/** Conexión dedicada al worker de la cola. */
export function getWorkerRedis(): Redis {
  if (!workerRedis) workerRedis = getRedis().duplicate()
  return workerRedis
}

/** Cola del worker (claim/ack/retry/reap/touch). */
export function getWorkerQueue(): RedisAnalysisQueue {
  if (!workerQueue) workerQueue = new RedisAnalysisQueue(getWorkerRedis())
  return workerQueue
}
