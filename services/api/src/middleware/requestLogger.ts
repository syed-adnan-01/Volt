// ──────────────────────────────────────────────
// Request Logger Middleware
// Assigns a unique requestId to every request,
// measures latency, and logs method/path/status.
// ──────────────────────────────────────────────

import type { MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = nanoid(12);
  const start = Date.now();

  // Attach requestId so downstream handlers can use it
  c.set('requestId', requestId);

  // Set response header for client-side tracing
  c.header('X-Request-Id', requestId);

  await next();

  const latencyMs = Date.now() - start;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;

  // Log format: [requestId] METHOD /path → STATUS (latency)
  console.log(
    `[${requestId}] ${method} ${path} → ${status} (${latencyMs}ms)`,
  );
};
