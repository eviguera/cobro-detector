import { Redis } from 'ioredis'
import type { AnalysisQueue, QueueJob } from '../../domain/ports/queue.port.js'

const QUEUE_KEY = 'analysis:queue'

export class RedisAnalysisQueue implements AnalysisQueue {
  private readonly redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async enqueue(job: QueueJob): Promise<void> {
    await this.redis.rpush(QUEUE_KEY, JSON.stringify(job))
  }

  async dequeue(): Promise<QueueJob | null> {
    const result = await this.redis.blpop(QUEUE_KEY, 0)
    if (!result) return null
    const [, value] = result
    return JSON.parse(value) as QueueJob
  }

  async getLength(): Promise<number> {
    return this.redis.llen(QUEUE_KEY)
  }
}
