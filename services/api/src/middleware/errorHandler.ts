// ──────────────────────────────────────────────
// Global Error Handler Middleware
// Catches all errors and returns the standard
// response envelope. Never leaks internal details.
// ──────────────────────────────────────────────

import type { ErrorHandler } from 'hono';
import { ErrorCode } from '@volt/contracts';
import { AppError } from '../utils/AppError.js';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') ?? 'unknown';

  // Known application error
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        data: null,
        error: {
          code: err.code,
          message: err.message,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      err.statusCode as any,
    );
  }

  // Unexpected error — log full details, return generic message
  console.error(`[${requestId}] Unhandled error:`, err);

  return c.json(
    {
      success: false,
      data: null,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    500,
  );
};
