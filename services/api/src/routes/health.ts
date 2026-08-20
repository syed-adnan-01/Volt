// ──────────────────────────────────────────────
// Health Check Route
// GET /health — reports API, PostgreSQL, Redis
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { pool } from '../db/client.js';
import { redis } from '../cache/redisClient.js';
import { success, error } from '../utils/response.js';

const health = new Hono();

interface ComponentStatus {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

health.get('/', async (c) => {
  const components: Record<string, ComponentStatus> = {};

  // Check PostgreSQL
  const pgStart = Date.now();
  try {
    await pool.query('SELECT 1');
    components.postgres = {
      status: 'healthy',
      latencyMs: Date.now() - pgStart,
    };
  } catch (err: any) {
    components.postgres = {
      status: 'unhealthy',
      latencyMs: Date.now() - pgStart,
      error: err.message,
    };
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    await redis.ping();
    components.redis = {
      status: 'healthy',
      latencyMs: Date.now() - redisStart,
    };
  } catch (err: any) {
    components.redis = {
      status: 'unhealthy',
      latencyMs: Date.now() - redisStart,
      error: err.message,
    };
  }

  // Overall status
  const allHealthy = Object.values(components).every(
    (comp) => comp.status === 'healthy',
  );

  const data = {
    status: allHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    components,
  };

  if (allHealthy) {
    return success(c, data);
  }

  // Return 503 if any dependency is unhealthy
  return error(c, 'SERVICE_DEGRADED', 'One or more dependencies are unhealthy', 503);
});

export default health;
