// ──────────────────────────────────────────────
// Redis Cache Utility
// Provides safe, typed JSON get and set helpers.
// ──────────────────────────────────────────────

import { redis } from './redisClient.js';

/**
 * Retrieves a cached JSON object by key.
 * Returns null on cache miss or if Redis is unavailable.
 */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error: any) {
    console.warn(`⚠️ Cache GET failed for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Stores an object as JSON in Redis with a TTL in seconds.
 * Fails gracefully without throwing error.
 */
export async function setCachedJson(
  key: string,
  data: any,
  ttlSeconds: number
): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    await redis.setex(key, ttlSeconds, serialized);
  } catch (error: any) {
    console.warn(`⚠️ Cache SET failed for key "${key}":`, error.message);
  }
}
