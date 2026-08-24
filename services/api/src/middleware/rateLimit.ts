import type { MiddlewareHandler } from 'hono';
import { AppError } from '../utils/AppError.js';

/**
 * Mock rate limiter for Phase 4.
 * In a real implementation, this would use redisClient.
 */
export const rateLimit = (options: { windowMs: number; max: number }): MiddlewareHandler => {
  const store = new Map<string, { count: number, resetTime: number }>();

  return async (c, next) => {
    // Group by IP or user_id
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
    const key = `rl:${ip}`;
    
    const now = Date.now();
    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + options.windowMs };
    }

    record.count++;
    store.set(key, record);

    if (record.count > options.max) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED' as any, 'Too many requests, please try again later.');
    }

    await next();
  };
};
