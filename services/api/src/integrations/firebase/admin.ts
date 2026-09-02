// ──────────────────────────────────────────────
// Firebase Admin SDK Initialisation
// Uses service-account credentials from env vars with
// graceful fallback for local development.
// ──────────────────────────────────────────────

import admin, { type auth } from 'firebase-admin';
import { env } from '../../config/env.js';

let app: admin.app.App;

try {
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
} catch (err: any) {
  console.warn('⚠️ Firebase Admin SDK running in development mode (real cert not configured).');
  // Initialize mock app instance if needed
  if (admin.apps.length === 0) {
    app = admin.initializeApp({
      projectId: 'volt-dev',
    });
  } else {
    app = admin.apps[0]!;
  }
}

export const firebaseAuth: auth.Auth = admin.auth(app);
export const firebaseMessaging: admin.messaging.Messaging = admin.messaging(app);
export default app;
