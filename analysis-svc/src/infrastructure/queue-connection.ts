import { Redis } from 'ioredis'
import { RedisAnalysisQueue } from './adapters/redis-queue.adapter.js'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
export const queue = new RedisAnalysisQueue(redis)
