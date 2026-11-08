import { Redis } from 'ioredis'
import type { AnalysisQueue, QueueJob } from '../../domain/ports/queue.port.js'

const QUEUE_KEY = 'analysis:queue'
const BLOCK_TIMEOUT_SECONDS = 5

export class RedisAnalysisQueue implements AnalysisQueue {
  private readonly redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async enqueue(job: QueueJob): Promise<void> {
    await this.redis.rpush(QUEUE_KEY, JSON.stringify(job))
  }

  async dequeue(): Promise<QueueJob | null> {
    // Timeout acotado (en vez de 0) para que el bucle pueda reaccionar a
    // señales de apagado y a errores de conexión sin quedar bloqueado.
    const result = await this.redis.blpop(QUEUE_KEY, BLOCK_TIMEOUT_SECONDS)
    if (!result) return null
    const [, value] = result
    return JSON.parse(value) as QueueJob
  }

  async getLength(): Promise<number> {
    return this.redis.llen(QUEUE_KEY)
  }
}
