// ──────────────────────────────────────────────
// Custom Application Error
// Thrown throughout the app and caught by the
// global error handler for consistent responses.
// ──────────────────────────────────────────────

import type { ErrorCodeType } from '@volt/contracts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;

  constructor(statusCode: number, code: ErrorCodeType, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
