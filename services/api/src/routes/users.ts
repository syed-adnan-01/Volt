// ──────────────────────────────────────────────
// Users Routes
// Handles /users/me endpoints.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { LocalUserContext } from '../integrations/firebase/userSync.js';

type Variables = {
  requestId: string;
  user: LocalUserContext;
};

const usersRouter = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes in this router
usersRouter.use('*', requireAuth);

usersRouter.get('/me', async (c) => {
  const userContext = c.get('user');

  const result = await query(
    `SELECT id, email, name, phone, role, created_at, updated_at
     FROM users WHERE id = $1`,
    [userContext.id]
  );

  return c.json({
    success: true,
    data: result.rows[0],
    error: null,
    meta: {
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
  });
});

const patchUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
});

usersRouter.patch(
  '/me',
  zValidator('json', patchUserSchema),
  async (c) => {
    const userContext = c.get('user');
    const body = c.req.valid('json');

    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           updated_at = now()
       WHERE id = $3
       RETURNING id, email, name, phone, role, created_at, updated_at`,
      [body.name ?? null, body.phone ?? null, userContext.id]
    );

    return c.json({
      success: true,
      data: result.rows[0],
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// ── Device Token Registration for FCM ─────────
const deviceTokenSchema = z.object({
  fcm_token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

usersRouter.post(
  '/me/device-token',
  zValidator('json', deviceTokenSchema),
  async (c) => {
    const userContext = c.get('user');
    const body = c.req.valid('json');

    await query(
      `INSERT INTO device_tokens (user_id, fcm_token, platform, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, fcm_token)
       DO UPDATE SET platform = EXCLUDED.platform, updated_at = now()`,
      [userContext.id, body.fcm_token, body.platform]
    );

    return c.json({
      success: true,
      data: { registered: true, platform: body.platform },
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    }, 201);
  }
);

usersRouter.delete(
  '/me/device-token',
  zValidator('json', z.object({ fcm_token: z.string().min(1) })),
  async (c) => {
    const userContext = c.get('user');
    const body = c.req.valid('json');

    await query(
      `DELETE FROM device_tokens WHERE user_id = $1 AND fcm_token = $2`,
      [userContext.id, body.fcm_token]
    );

    return c.json({
      success: true,
      data: { unregistered: true },
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export default usersRouter;
