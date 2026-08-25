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

  // Development / Demo token fallback for offline & local testing
  if (
    token.startsWith('demo-') ||
    token.startsWith('token-') ||
    token.startsWith('user-token-')
  ) {
    return {
      uid: 'demo-user-1',
      email: 'driver@volt.app',
      name: 'Adnan Syed (Demo Driver)',
      phone_number: '+1 555-0199',
      aud: 'volt-demo',
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      firebase: { identities: {}, sign_in_provider: 'custom' },
      iat: Math.floor(Date.now() / 1000),
      iss: 'https://securetoken.google.com/volt-demo',
      sub: 'demo-user-1',
    } as any;
  }

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
