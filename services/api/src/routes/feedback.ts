import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { LocalUserContext } from '../integrations/firebase/userSync.js';

const feedbackRouter = new Hono<{ Variables: { requestId: string; user: LocalUserContext } }>();

feedbackRouter.use('*', requireAuth);

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comments: z.string().optional(),
  broken_plugs: z.number().min(0).default(0)
});

feedbackRouter.post('/:id/feedback', zValidator('json', feedbackSchema), async (c) => {
  const stationId = c.req.param('id');
  const user = c.get('user');
  const body = c.req.valid('json');

  await query(`
    INSERT INTO user_feedback (user_id, station_id, rating, comments, broken_plugs)
    VALUES ($1, $2, $3, $4, $5)
  `, [user.id, stationId, body.rating, body.comments, body.broken_plugs]);

  return c.json({
    success: true,
    data: { message: 'Feedback submitted' },
    error: null,
    meta: { requestId: c.get('requestId'), timestamp: new Date().toISOString() }
  }, 201);
});

export default feedbackRouter;
