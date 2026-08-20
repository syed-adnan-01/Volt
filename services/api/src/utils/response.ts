// ──────────────────────────────────────────────
// Standard API Response Helpers
// Ensures every response uses the same envelope.
// ──────────────────────────────────────────────

import type { Context } from 'hono';
import type { ApiResponse } from '@volt/contracts';

/**
 * Send a successful response.
 */
export function success<T>(c: Context, data: T, statusCode = 200): Response {
  const requestId = c.get('requestId') ?? 'unknown';

  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return c.json(body, statusCode as any);
}

/**
 * Send an error response.
 */
export function error(
  c: Context,
  code: string,
  message: string,
  statusCode = 500,
): Response {
  const requestId = c.get('requestId') ?? 'unknown';

  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return c.json(body, statusCode as any);
}
