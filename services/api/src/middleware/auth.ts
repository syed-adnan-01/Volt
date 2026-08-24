// ──────────────────────────────────────────────
// Authentication Middleware
// Verifies Firebase ID Token and maps to local user.
// ──────────────────────────────────────────────

import type { MiddlewareHandler } from 'hono';
import { verifyFirebaseToken } from '../integrations/firebase/verifyToken.js';
import { syncUserFromFirebase, type LocalUserContext } from '../integrations/firebase/userSync.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCode } from '@volt/contracts';

type Variables = {
  requestId: string;
  user: LocalUserContext;
};

export const requireAuth: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  try {
    // 1. Verify token with Firebase Admin
    const decodedToken = await verifyFirebaseToken(authHeader);

    // 2. Map to internal PostgreSQL user
    const user = await syncUserFromFirebase(decodedToken);

    // 3. Inject into request context
    c.set('user', user);

    await next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      401,
      ErrorCode.AUTH_INVALID,
      'Authentication failed.'
    );
  }
};
