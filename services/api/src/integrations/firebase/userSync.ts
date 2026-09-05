// ──────────────────────────────────────────────
// User Synchronization
// Maps Firebase UIDs to our local PostgreSQL users.
// ──────────────────────────────────────────────

import { query } from '../../db/client.js';
import type { DecodedIdToken } from 'firebase-admin/auth';

export type LocalUserContext = {
  id: string;
  firebase_uid: string;
  role: string;
};

/**
 * Ensures a user exists in the local PostgreSQL database for the given Firebase UID.
 * If the user does not exist, they are automatically created.
 */
export async function syncUserFromFirebase(
  decodedToken: DecodedIdToken
): Promise<LocalUserContext> {
  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email || null;
  const name = decodedToken.name || null;
  const phone = decodedToken.phone_number || null;

  try {
    // 1. Try to fetch existing user
    const fetchResult = await query(
      `SELECT id, firebase_uid, role FROM users WHERE firebase_uid = $1`,
      [firebaseUid]
    );

    if (fetchResult.rows.length > 0) {
      return fetchResult.rows[0] as LocalUserContext;
    }

    // 2. User doesn't exist, create them
    const insertResult = await query(
      `
      INSERT INTO users (firebase_uid, email, name, phone, role)
      VALUES ($1, $2, $3, $4, 'USER')
      RETURNING id, firebase_uid, role
      `,
      [firebaseUid, email, name, phone]
    );

    return insertResult.rows[0] as LocalUserContext;
  } catch (err: any) {
    console.warn(`⚠️ User sync database query failed (${err?.message}). Providing fallback user context.`);
    return {
      id: firebaseUid,
      firebase_uid: firebaseUid,
      role: 'USER',
    };
  }
}
