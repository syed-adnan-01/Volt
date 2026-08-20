// ──────────────────────────────────────────────
// Firebase Admin SDK Initialisation
// Uses service-account credentials from env vars.
// ──────────────────────────────────────────────

import admin, { type auth } from 'firebase-admin';
import { env } from '../../config/env.js';

// The private key arrives from .env with literal "\n" — convert to real newlines
const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

export const firebaseAuth: auth.Auth = admin.auth(app);
export default app;
