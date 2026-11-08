import { Redis } from 'ioredis'
import { RedisAnalysisQueue } from './adapters/redis-queue.adapter.js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

/**
 * Conexión usada por las rutas HTTP para encolar jobs (RPUSH).
 *
 * IMPORTANTE: no debe usarse para `dequeue()`. `BLPOP` bloquea la conexión
 * completa en Redis, así que si el worker comparte esta conexión los RPUSH del
 * endpoint quedan encolados detrás del bloqueo y `POST /v1/analyze` nunca
 * responde. Por eso el worker tiene su propia conexión (`workerRedis`).
 */
export const redis = new Redis(redisUrl)

/** Conexión dedicada al worker de la cola (BLPOP). */
export const workerRedis = redis.duplicate()

export const queue = new RedisAnalysisQueue(redis)
export const workerQueue = new RedisAnalysisQueue(workerRedis)
