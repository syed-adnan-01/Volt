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
  radiusKm: z.coerce.number().default(25)
});

stationsRouter.get('/', zValidator('query', searchSchema), async (c) => {
  const { lat, lng, radiusKm } = c.req.valid('query');
  
  const result = await query(`
    SELECT 
      cs.id,
      cs.name,
      cs.operator,
      cs.operator AS operator_name,
      cs.address,
      ST_Y(cs.location::geometry) AS latitude,
      ST_X(cs.location::geometry) AS longitude,
      ST_Distance(cs.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters,
      cs.status,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'station_id', c.station_id,
              'connector_type', c.connector_type,
              'power_kw', c.power_kw::float,
              'status', c.status
            )
          )
          FROM connectors c
          WHERE c.station_id = cs.id
        ),
        '[]'::json
      ) AS connectors,
      COALESCE((SELECT MAX(power_kw)::float FROM connectors c WHERE c.station_id = cs.id), 150.0) AS power_kw,
      COALESCE((SELECT MAX(power_kw)::float FROM connectors c WHERE c.station_id = cs.id), 150.0) AS max_power_kw,
      COALESCE((SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id AND c.status = 'available'), 0)::int AS available_plugs,
      COALESCE((SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id), 1)::int AS total_plugs
    FROM charging_stations cs
    WHERE ST_DWithin(
      cs.location,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3 * 1000
    )
    ORDER BY distance_meters ASC
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
  const result = await query(`
    SELECT 
      cs.id,
      cs.name,
      cs.operator,
      cs.operator AS operator_name,
      cs.address,
      ST_Y(cs.location::geometry) AS latitude,
      ST_X(cs.location::geometry) AS longitude,
      cs.status,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'station_id', c.station_id,
              'connector_type', c.connector_type,
              'power_kw', c.power_kw::float,
              'status', c.status
            )
          )
          FROM connectors c
          WHERE c.station_id = cs.id
        ),
        '[]'::json
      ) AS connectors,
      COALESCE((SELECT MAX(power_kw)::float FROM connectors c WHERE c.station_id = cs.id), 150.0) AS power_kw,
      COALESCE((SELECT MAX(power_kw)::float FROM connectors c WHERE c.station_id = cs.id), 150.0) AS max_power_kw,
      COALESCE((SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id AND c.status = 'available'), 0)::int AS available_plugs,
      COALESCE((SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id), 1)::int AS total_plugs
    FROM charging_stations cs
    WHERE cs.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Station not found');
  }

  return c.json({ success: true, data: result.rows[0], error: null, meta: { requestId: c.get('requestId') } });
});

stationsRouter.get('/:id/status', async (c) => {
  const id = c.req.param('id');
  const result = await query(`
    SELECT 
      cs.id AS station_id,
      COALESCE(ss.available_connectors, (SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id AND c.status = 'available')::int) AS available_connectors,
      COALESCE(ss.occupied_connectors, (SELECT COUNT(*) FROM connectors c WHERE c.station_id = cs.id AND c.status = 'occupied')::int) AS occupied_connectors,
      COALESCE(ss.status, cs.status) AS status,
      COALESCE(ss.source, 'SYSTEM_OBSERVATION') AS source
    FROM charging_stations cs
    LEFT JOIN LATERAL (
      SELECT * FROM station_status ss 
      WHERE ss.station_id = cs.id 
      ORDER BY ss.observed_at DESC 
      LIMIT 1
    ) ss ON true
    WHERE cs.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return c.json({
      success: true,
      data: { stationId: id, status: 'ONLINE', available_connectors: 2, occupied_connectors: 0 },
      error: null,
      meta: { requestId: c.get('requestId') }
    });
  }

  return c.json({
    success: true,
    data: result.rows[0],
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
