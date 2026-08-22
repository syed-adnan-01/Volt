// ──────────────────────────────────────────────
// Trips Router (The Orchestrator)
// Coordinates Routing, Battery, and DB persistence.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AppError } from '../utils/AppError.js';
import { getRoute } from '../integrations/routingClient.js';
import { checkReachability } from '../integrations/batteryClient.js';
import type { LocalUserContext } from '../integrations/firebase/userSync.js';

type Variables = {
  requestId: string;
  user: LocalUserContext;
};

const tripsRouter = new Hono<{ Variables: Variables }>();

tripsRouter.use('*', requireAuth);

const planTripSchema = z.object({
  vehicle_id: z.string().uuid(),
  current_soc: z.number().min(0).max(100),
  origin_lat: z.number().min(-90).max(90),
  origin_lng: z.number().min(-180).max(180),
  dest_lat: z.number().min(-90).max(90),
  dest_lng: z.number().min(-180).max(180),
});

tripsRouter.post(
  '/',
  zValidator('json', planTripSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    // 1. Verify user owns the vehicle
    const vehicleCheck = await query(
      `SELECT id FROM vehicles WHERE id = $1 AND user_id = $2`,
      [body.vehicle_id, user.id]
    );

    if (vehicleCheck.rows.length === 0) {
      throw new AppError(403, 'FORBIDDEN' as any, 'Vehicle not found or not owned by user.');
    }

    // 2. Call Routing Service to get distance and time
    const route = await getRoute(
      body.origin_lat, body.origin_lng,
      body.dest_lat, body.dest_lng
    );

    // 3. Call Battery Engine to simulate consumption
    const batteryResult = await checkReachability(
      body.vehicle_id,
      body.current_soc,
      route.distanceKm
    );

    // Phase 2 Happy Path: Ensure the destination is reachable without charging
    if (!batteryResult.reachable) {
      throw new AppError(
        422,
        'INSUFFICIENT_BATTERY' as any,
        'Destination is not reachable without charging. (Multi-stop logic coming in Phase 3!)'
      );
    }

    // 4. Persist the trip to PostGIS database
    const insertResult = await query(
      `INSERT INTO trips (
         user_id, vehicle_id, status, origin, destination
       ) VALUES (
         $1, $2, 'planned',
         ST_SetSRID(ST_MakePoint($3, $4), 4326),
         ST_SetSRID(ST_MakePoint($5, $6), 4326)
       ) RETURNING id`,
      [
        user.id,
        body.vehicle_id,
        body.origin_lng, // longitude first in PostGIS ST_MakePoint
        body.origin_lat,
        body.dest_lng,
        body.dest_lat,
      ]
    );

    const tripId = insertResult.rows[0].id;

    // 5. Construct the final TripPlan payload
    return c.json({
      success: true,
      data: {
        tripId,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        battery: batteryResult,
        geometry: route.geometry,
      },
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    }, 201);
  }
);

export default tripsRouter;
