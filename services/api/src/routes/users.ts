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

export default usersRouter;
