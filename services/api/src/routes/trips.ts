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
import { optimizeTrip, rerouteTrip, OptimizerResult, TripStop } from '../integrations/optimizerClient.js';

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

    // 1. Verify user owns the vehicle and fetch vehicle specifications
    const vehicleQuery = await query(
      `SELECT id, make, model, battery_capacity_kwh, usable_capacity_kwh,
              consumption_kwh_per_km, battery_health_percent, reserve_soc_percent,
              max_charging_power_kw
       FROM vehicles WHERE id = $1 AND user_id = $2`,
      [body.vehicle_id, user.id]
    );

    if (vehicleQuery.rows.length === 0) {
      throw new AppError(403, 'FORBIDDEN' as any, 'Vehicle not found or not owned by user.');
    }

    const vehicleRow = vehicleQuery.rows[0];
    const vehicleProfile = {
      batteryCapacityKwh: Number(vehicleRow.battery_capacity_kwh),
      usableCapacityKwh: Number(vehicleRow.usable_capacity_kwh),
      consumptionKwhPerKm: Number(vehicleRow.consumption_kwh_per_km),
      reserveSocPercent: Number(vehicleRow.reserve_soc_percent),
      batteryHealthPercent: Number(vehicleRow.battery_health_percent),
      maxChargingPowerKw: Number(vehicleRow.max_charging_power_kw),
    };

    // 2. Call Routing Service to get distance and duration
    const route = await getRoute(
      body.origin_lat, body.origin_lng,
      body.dest_lat, body.dest_lng
    );

    // 3. Call Battery Engine (Member 3) with real vehicle profile
    const batteryResult = await checkReachability(
      body.vehicle_id,
      body.current_soc,
      route.distanceKm,
      vehicleProfile
    );

    let finalStops: TripStop[] = [];
    let optimizerResult: OptimizerResult | null = null;

    // 4. Multi-Stop Optimization (Member 5 + Member 4) when charging is required
    if (!batteryResult.reachable) {
      try {
        const candidateChargers = await findChargersAlongRoute(route.geometry);
        const stationIds = candidateChargers.map(c => c.id);
        
        // Member 4 ML Prediction Service
        const predictions = await getStationPredictions(stationIds);
        
        // Member 5 EV Multi-Stop Optimizer
        optimizerResult = await optimizeTrip({
          origin: { lat: body.origin_lat, lng: body.origin_lng, name: 'Origin' },
          destination: { lat: body.dest_lat, lng: body.dest_lng, name: 'Destination' },
          vehicleId: body.vehicle_id,
          currentSoc: body.current_soc,
          vehicleProfile,
          candidateChargers,
          predictions,
          mode: 'BALANCED',
        });

        if (optimizerResult.status === 'UNREACHABLE') {
          throw new AppError(422, 'INSUFFICIENT_BATTERY' as any, optimizerResult.reason || 'Destination is not reachable even with charging stops.');
        }

        finalStops = optimizerResult.stops;

        // Ensure mock stations exist in DB to prevent foreign key errors for trip_stops
        for (const stop of finalStops) {
          await query(
            `INSERT INTO charging_stations (id, name, latitude, longitude, operator_name, max_power_kw)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              stop.stationId,
              stop.name || `Station ${stop.stationId.substring(0, 8)}`,
              stop.latitude,
              stop.longitude,
              'VOLT Network',
              stop.powerKw || 60
            ]
          );
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(500, 'INTERNAL_ERROR' as any, 'Failed to compute charging stops.');
      }
    }

    // 5. Persist the trip to PostGIS database
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

    // 6. Persist trip_stops
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

    // 7. Construct final dual-cased TripPlan payload (compatible with Android VoltDtos and Web)
    const formattedStops = finalStops.map(s => ({
      ...s,
      station_id: s.stationId,
      arrival_soc: s.arrivalSoc,
      departure_soc: s.departureSoc,
      expected_wait_minutes: s.expectedWaitMinutes,
      charging_minutes: s.chargingMinutes,
      energy_added_kwh: s.energyAddedKwh ?? 0,
    }));

    const formattedOptimizerData = optimizerResult ? {
      totalWaitMinutes: optimizerResult.totalWaitMinutes,
      total_wait_minutes: optimizerResult.totalWaitMinutes,
      totalChargingMinutes: optimizerResult.totalChargingMinutes,
      total_charging_minutes: optimizerResult.totalChargingMinutes,
      finalSoc: optimizerResult.finalSoc,
      final_soc: optimizerResult.finalSoc,
      reason: optimizerResult.reason,
      mode: optimizerResult.mode,
    } : null;

    return c.json({
      success: true,
      data: {
        tripId,
        trip_id: tripId,
        distanceKm: route.distanceKm,
        distance_km: route.distanceKm,
        durationMinutes: Math.round(route.durationMinutes),
        duration_minutes: Math.round(route.durationMinutes),
        battery: {
          ...batteryResult,
          safetyMarginPercent: batteryResult.safetyMarginPercent ?? 0,
        },
        geometry: typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry),
        stops: formattedStops,
        optimizerData: formattedOptimizerData,
        optimizer_data: formattedOptimizerData,
      },
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    }, 201);
  }
);

tripsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const tripQuery = await query(`SELECT * FROM trips WHERE id = $1 AND user_id = $2`, [id, user.id]);
  if (tripQuery.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Trip not found');
  }

  const stopsQuery = await query(`SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY sequence ASC`, [id]);

  return c.json({
    success: true,
    data: { ...tripQuery.rows[0], stops: stopsQuery.rows },
    error: null,
    meta: { requestId: c.get('requestId') }
  });
});

tripsRouter.get('/:id/plan', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const tripQuery = await query(`SELECT * FROM trips WHERE id = $1 AND user_id = $2`, [id, user.id]);
  if (tripQuery.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Trip not found');
  }

  const stopsQuery = await query(`SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY sequence ASC`, [id]);

  return c.json({
    success: true,
    data: {
      tripId: id,
      trip_id: id,
      status: tripQuery.rows[0].status,
      stops: stopsQuery.rows,
    },
    error: null,
    meta: { requestId: c.get('requestId') }
  });
});

tripsRouter.post('/:id/reroute', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  // Verify trip belongs to user and load vehicle specs and coordinates
  const tripCheck = await query(
    `SELECT t.*, v.battery_capacity_kwh, v.usable_capacity_kwh, v.consumption_kwh_per_km,
            v.reserve_soc_percent, v.max_charging_power_kw,
            ST_X(t.origin::geometry) as origin_lng, ST_Y(t.origin::geometry) as origin_lat,
            ST_X(t.destination::geometry) as dest_lng, ST_Y(t.destination::geometry) as dest_lat
     FROM trips t
     JOIN vehicles v ON t.vehicle_id = v.id
     WHERE t.id = $1 AND t.user_id = $2`,
    [id, user.id]
  );

  if (tripCheck.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Trip not found');
  }

  const trip = tripCheck.rows[0];
  const stopsQuery = await query(`SELECT station_id FROM trip_stops WHERE trip_id = $1 ORDER BY sequence ASC`, [id]);
  const currentPlannedStops = stopsQuery.rows.map(r => r.station_id);

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const currentLat = body.current_lat ?? trip.origin_lat;
  const currentLng = body.current_lng ?? trip.origin_lng;
  const currentSoc = body.current_soc ?? 30;

  const rerouteResult = await rerouteTrip({
    currentLocation: { lat: currentLat, lng: currentLng, name: 'Driver Current Location' },
    destination: { lat: trip.dest_lat, lng: trip.dest_lng, name: 'Trip Destination' },
    currentSoc,
    currentPlannedStops,
    vehicleProfile: {
      batteryCapacityKwh: Number(trip.battery_capacity_kwh),
      consumptionKwhPerKm: Number(trip.consumption_kwh_per_km),
      reserveSocPercent: Number(trip.reserve_soc_percent),
      maxChargingPowerKw: Number(trip.max_charging_power_kw),
    },
    mode: body.mode || 'BALANCED',
  });

  if (rerouteResult.rerouteRecommended && rerouteResult.stops.length > 0) {
    await query(`DELETE FROM trip_stops WHERE trip_id = $1`, [id]);
    for (const stop of rerouteResult.stops) {
      await query(
        `INSERT INTO trip_stops (
           trip_id, station_id, sequence, arrival_soc, departure_soc,
           expected_wait_minutes, charging_minutes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'rerouted')`,
        [
          id,
          stop.stationId,
          stop.sequence,
          stop.arrivalSoc,
          stop.departureSoc,
          stop.expectedWaitMinutes,
          stop.chargingMinutes,
        ]
      );
    }
    await query(`UPDATE trips SET status = 'rerouted', updated_at = now() WHERE id = $1`, [id]);
  }

  return c.json({
    success: true,
    data: {
      tripId: id,
      trip_id: id,
      rerouteRecommended: rerouteResult.rerouteRecommended,
      reroute_recommended: rerouteResult.rerouteRecommended,
      triggerEvent: rerouteResult.triggerEvent,
      trigger_event: rerouteResult.triggerEvent,
      rerouteReason: rerouteResult.rerouteReason,
      reroute_reason: rerouteResult.rerouteReason,
      stops: rerouteResult.stops,
    },
    error: null,
    meta: { requestId: c.get('requestId'), timestamp: new Date().toISOString() }
  }, 200);
});

tripsRouter.patch('/:id/status', zValidator('json', z.object({ status: z.string() })), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const { status } = c.req.valid('json');

  const result = await query(
    `UPDATE trips SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
    [status, id, user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND' as any, 'Trip not found');
  }

  return c.json({
    success: true,
    data: result.rows[0],
    error: null,
    meta: { requestId: c.get('requestId') }
  });
});

export default tripsRouter;
