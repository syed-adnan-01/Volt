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
import { findChargersAlongRoute, MOCK_STATION_ID_1, MOCK_STATION_ID_2 } from '../integrations/chargerClient.js';
import { getStationPredictions } from '../integrations/predictionClient.js';
import { optimizeTrip, OptimizerResult, TripStop } from '../integrations/optimizerClient.js';

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

    let finalStops: TripStop[] = [];
    let optimizerResult: OptimizerResult | null = null;

    // Phase 3 Multi-Stop Logic
    if (!batteryResult.reachable) {
      try {
        const candidateChargers = await findChargersAlongRoute(route.geometry);
        const stationIds = candidateChargers.map(c => c.id);
        const predictions = await getStationPredictions(stationIds);
        
        optimizerResult = await optimizeTrip(
          route,
          body.vehicle_id,
          body.current_soc,
          candidateChargers,
          predictions
        );

        if (optimizerResult.status === 'UNREACHABLE') {
          throw new AppError(422, 'INSUFFICIENT_BATTERY' as any, 'Destination is not reachable even with charging stops.');
        }

        finalStops = optimizerResult.stops;

        // Ensure mock stations exist in DB to prevent foreign key errors for trip_stops
        for (const charger of candidateChargers) {
          await query(
            `INSERT INTO charging_stations (id, name, latitude, longitude, operator_name, max_power_kw)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              charger.id,
              `Mock Station ${charger.id.split('-')[0]}`,
              charger.latitude,
              charger.longitude,
              charger.operator,
              charger.maxPowerKw
            ]
          );
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(500, 'INTERNAL_ERROR' as any, 'Failed to compute charging stops.');
      }
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

    // 5. Persist trip_stops
    for (const stop of finalStops) {
      await query(
        `INSERT INTO trip_stops (
           trip_id, station_id, sequence, arrival_soc, departure_soc,
           expected_wait_minutes, charging_minutes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned')`,
        [
          tripId,
          stop.stationId,
          stop.sequence,
          stop.arrivalSoc,
          stop.departureSoc,
          stop.expectedWaitMinutes,
          stop.chargingMinutes,
        ]
      );
    }

    // 6. Construct the final TripPlan payload
    return c.json({
      success: true,
      data: {
        tripId,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        battery: batteryResult,
        geometry: route.geometry,
        stops: finalStops,
        optimizerData: optimizerResult ? {
          totalWaitMinutes: optimizerResult.totalWaitMinutes,
          totalChargingMinutes: optimizerResult.totalChargingMinutes,
          finalSoc: optimizerResult.finalSoc
        } : null,
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
