// ──────────────────────────────────────────────
// Redis Client
// Singleton ioredis instance for caching,
// rate limiting, and live state.
// ──────────────────────────────────────────────

import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis.default(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('Redis connected.');
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err.message);
});

/**
 * Graceful shutdown — disconnect Redis.
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
  console.log('Redis disconnected.');
}
