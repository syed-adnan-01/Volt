// ──────────────────────────────────────────────
// VOLT API Server Entry Point
// Loads environment, connects services,
// and starts the Hono HTTP server.
// ──────────────────────────────────────────────

import { serve } from '@hono/node-server';
import { env } from './config/env.js';
import { redis } from './cache/redisClient.js';
import { closePool } from './db/client.js';
import { closeRedis } from './cache/redisClient.js';
import app from './app.js';

async function main() {
  // Connect Redis (lazy connect mode)
  await redis.connect();

  console.log(`
  ╔═══════════════════════════════════════════╗
  ║          ⚡  VOLT API Gateway  ⚡          ║
  ╠═══════════════════════════════════════════╣
  ║  Environment : ${env.NODE_ENV.padEnd(25)} ║
  ║  Port        : ${String(env.PORT).padEnd(25)} ║
  ╚═══════════════════════════════════════════╝
  `);

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`🚀 Server listening on http://localhost:${info.port}`);
    },
  );

  // ── Graceful Shutdown ─────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down…`);
    await closeRedis();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
