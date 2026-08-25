import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { getStationPredictions } from '../integrations/predictionClient.js';

const stationsRouter = new Hono<{ Variables: { requestId: string } }>();

stationsRouter.use('*', requireAuth);

const searchSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().default(5)
});

stationsRouter.get('/', zValidator('query', searchSchema), async (c) => {
  const { lat, lng, radiusKm } = c.req.valid('query');
  
  const result = await query(`
    SELECT id, name, latitude, longitude, operator_name, max_power_kw, plug_count
    FROM charging_stations
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3 * 1000
    )
  `, [lng, lat, radiusKm]);

  return c.json({
    success: true,
    data: result.rows,
    error: null,
    meta: { requestId: c.get('requestId'), timestamp: new Date().toISOString() }
  });
});

stationsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await query(`SELECT * FROM charging_stations WHERE id = $1`, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Station not found');
  }

  return c.json({ success: true, data: result.rows[0], error: null, meta: { requestId: c.get('requestId') } });
});

stationsRouter.get('/:id/status', async (c) => {
  const id = c.req.param('id');
  // Mock status returning
  return c.json({
    success: true,
    data: { stationId: id, status: 'ONLINE', available_plugs: 2 },
    error: null,
    meta: { requestId: c.get('requestId') }
  });
});

stationsRouter.get('/:id/predictions', async (c) => {
  const id = c.req.param('id');
  const predictions = await getStationPredictions([id]);
  
  return c.json({
    success: true,
    data: predictions[id] || null,
    error: null,
    meta: { requestId: c.get('requestId') }
  });
});

export default stationsRouter;
