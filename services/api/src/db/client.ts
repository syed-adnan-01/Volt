// ──────────────────────────────────────────────
// PostgreSQL Client
// Connection pool for the API service.
// ──────────────────────────────────────────────

import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log connection errors (but don't crash — let health check report it)
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

/**
 * Run a parameterised query against the pool.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Acquire a dedicated client for transactions.
 * Caller is responsible for releasing it.
 */
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

/**
 * Graceful shutdown — drain connections.
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('PostgreSQL pool closed.');
}
