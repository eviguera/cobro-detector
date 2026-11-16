import { randomUUID } from 'node:crypto'
import { Redis } from 'ioredis'
import type {
  ClaimedJob,
  QueueEnvelope,
  QueueJob,
  ReliableAnalysisQueue,
} from '../../domain/ports/queue.port.js'

export interface QueueKeys {
  queue: string
  processing: string
  dead: string
}

const DEFAULT_KEYS: QueueKeys = {
  queue: 'analysis:queue',
  processing: 'analysis:processing',
  dead: 'analysis:dlq',
}

// --- Scripts Lua: las operaciones multi-comando deben ser atómicas para que
// --- dos workers no reclamen el mismo job y el reaper no duplique uno vivo.

// KEYS[1]=queue, KEYS[2]=processing, ARGV[1]=now-ms
// LPOP + ZADD en un solo paso: sin ventana en la que un crash pierda el job.
const CLAIM_LUA = `
local v = redis.call('LPOP', KEYS[1])
if not v then return false end
redis.call('ZADD', KEYS[2], ARGV[1], v)
return v
`

// KEYS[1]=processing, ARGV[1]=member
const ACK_LUA = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`

// KEYS[1]=processing, KEYS[2]=destino (queue o dlq), ARGV[1]=member viejo, ARGV[2]=member nuevo
// Condicional: si el ZREM no eliminó nada (otro worker hizo ack, u otro reaper
// ya lo reencoló), NO se hace RPUSH. Sin esto, un reaper que leyó el job stale
// justo cuando el worker vivo terminaba lo "resucitaba" ya procesado.
const RETRY_LUA = `
if redis.call('ZREM', KEYS[1], ARGV[1]) == 0 then return 0 end
redis.call('RPUSH', KEYS[2], ARGV[2])
return 1
`

// KEYS[1]=processing, ARGV[1]=cutoff-ms → members stales (solo lectura; el
// reencolado lo hace TypeScript vía retry() para reusar la lógica de intentos).
const STALE_LUA = `
return redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
`

type QueueRedis = Redis & {
  cdClaimJob(queue: string, processing: string, nowMs: string): Promise<string | false>
  cdAckJob(processing: string, member: string): Promise<number>
  cdRetryJob(processing: string, dest: string, oldMember: string, newMember: string): Promise<number>
  cdStaleJobs(processing: string, cutoffMs: string): Promise<string[]>
}

export class RedisAnalysisQueue implements ReliableAnalysisQueue {
  private readonly redis: QueueRedis
  private readonly keys: QueueKeys

  constructor(redis: Redis, keys: Partial<QueueKeys> = {}) {
    this.redis = redis as QueueRedis
    this.keys = { ...DEFAULT_KEYS, ...keys }
    // defineCommand registra el script en la conexión y lo expone como método.
    this.redis.defineCommand('cdClaimJob', { numberOfKeys: 2, lua: CLAIM_LUA })
    this.redis.defineCommand('cdAckJob', { numberOfKeys: 1, lua: ACK_LUA })
    this.redis.defineCommand('cdRetryJob', { numberOfKeys: 2, lua: RETRY_LUA })
    this.redis.defineCommand('cdStaleJobs', { numberOfKeys: 1, lua: STALE_LUA })
  }

  async enqueue(job: QueueJob): Promise<void> {
    const envelope: QueueEnvelope = {
      id: randomUUID(),
      attempts: 0,
      enqueuedAt: Date.now(),
      job,
    }
    await this.redis.rpush(this.keys.queue, JSON.stringify(envelope))
  }

  async claim(): Promise<ClaimedJob | null> {
    const raw = await this.redis.cdClaimJob(
      this.keys.queue,
      this.keys.processing,
      String(Date.now()),
    )
    if (raw === false || raw === null || raw === undefined) return null
    return { envelope: JSON.parse(raw) as QueueEnvelope, raw }
  }

  async ack(claimed: ClaimedJob): Promise<void> {
    await this.redis.cdAckJob(this.keys.processing, claimed.raw)
  }

  async retry(claimed: ClaimedJob, maxAttempts: number): Promise<'requeued' | 'dead' | 'gone'> {
    const attempts = claimed.envelope.attempts + 1
    const newEnvelope: QueueEnvelope = { ...claimed.envelope, attempts }
    const newRaw = JSON.stringify(newEnvelope)
    const dest = attempts >= maxAttempts ? this.keys.dead : this.keys.queue
    const applied = await this.redis.cdRetryJob(this.keys.processing, dest, claimed.raw, newRaw)
    // 'gone': otro worker hizo ack del job (o lo reencoló) mientras este
    // intentaba reintentar. No se reencola: ya está gestionado.
    if (applied === 0) return 'gone'
    return attempts >= maxAttempts ? 'dead' : 'requeued'
  }

  async touch(claimed: ClaimedJob): Promise<void> {
    // Heartbeat anti-reaper: refresca el score del job in-flight para que el
    // reaper no lo considere huérfano mientras sigue corriendo. `XX` solo
    // actualiza si el miembro existe (si ya hizo ack, es un no-op).
    await this.redis.zadd(this.keys.processing, 'XX', Date.now(), claimed.raw)
  }

  async reap(staleMs: number, maxAttempts: number): Promise<number> {
    const cutoff = String(Date.now() - staleMs)
    const stale = await this.redis.cdStaleJobs(this.keys.processing, cutoff)
    if (stale.length === 0) return 0

    let requeued = 0
    for (const raw of stale) {
      // Reutiliza retry(): el reintento por reap TAMBIÉN incrementa el
      // contador, así que un job que revierte reiteradamente a los workers
      // (p.ej. OOM) termina en la DLQ en vez de reciclarse para siempre.
      const outcome = await this.retry(
        { envelope: JSON.parse(raw) as QueueEnvelope, raw },
        maxAttempts,
      )
      if (outcome === 'requeued') requeued += 1
    }
    return requeued
  }

  async getLength(): Promise<number> {
    return this.redis.llen(this.keys.queue)
  }

  async getProcessingLength(): Promise<number> {
    return this.redis.zcard(this.keys.processing)
  }

  async getDeadLength(): Promise<number> {
    return this.redis.llen(this.keys.dead)
  }
}
