// ──────────────────────────────────────────────
// Firebase Token Verification
// Validates the ID token using the Admin SDK.
// ──────────────────────────────────────────────

import { firebaseAuth } from './admin.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCode } from '@volt/contracts';

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * @param authHeader The raw 'Authorization' header string (e.g., 'Bearer eyJhbG...')
 * @returns The decoded Firebase Token payload
 */
export async function verifyFirebaseToken(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      401,
      ErrorCode.AUTH_REQUIRED,
      'Missing or malformed Authorization header.'
    );
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error: any) {
    throw new AppError(
      401,
      ErrorCode.AUTH_INVALID,
      `Invalid or expired token: ${error.message}`
    );
  }
}
