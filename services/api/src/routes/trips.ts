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
import { getRoutes, getRoute } from '../integrations/routingClient.js';
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
  vehicle_id: z.string().optional(),
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

    // 1. Verify user owns the vehicle or resolve fallback vehicle profile
    let vehicleRow: any = null;
    if (body.vehicle_id) {
      try {
        const vehicleQuery = await query(
          `SELECT id, make, model, battery_capacity_kwh, usable_capacity_kwh,
                  consumption_kwh_per_km, battery_health_percent, reserve_soc_percent,
                  max_charging_power_kw
           FROM vehicles WHERE (id::text = $1 OR make ILIKE $1) AND user_id = $2 LIMIT 1`,
          [body.vehicle_id, user.id]
        );
        if (vehicleQuery.rows.length > 0) {
          vehicleRow = vehicleQuery.rows[0];
        }
      } catch {
        // Not a UUID or query error - fallback below
      }
    }

    if (!vehicleRow) {
      const defaultVehicleQuery = await query(
        `SELECT id, make, model, battery_capacity_kwh, usable_capacity_kwh,
                consumption_kwh_per_km, battery_health_percent, reserve_soc_percent,
                max_charging_power_kw
         FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [user.id]
      );
      if (defaultVehicleQuery.rows.length > 0) {
        vehicleRow = defaultVehicleQuery.rows[0];
      } else {
        vehicleRow = {
          id: '00000000-0000-0000-0000-000000000001',
          make: 'Tesla',
          model: 'Model 3',
          battery_capacity_kwh: 75.0,
          usable_capacity_kwh: 72.0,
          consumption_kwh_per_km: 0.150,
          battery_health_percent: 97.4,
          reserve_soc_percent: 10.0,
          max_charging_power_kw: 250.0,
        };
      }
    }

    const vehicleProfile = {
      batteryCapacityKwh: Number(vehicleRow.battery_capacity_kwh),
      usableCapacityKwh: Number(vehicleRow.usable_capacity_kwh),
      consumptionKwhPerKm: Number(vehicleRow.consumption_kwh_per_km),
      reserveSocPercent: Number(vehicleRow.reserve_soc_percent),
      batteryHealthPercent: Number(vehicleRow.battery_health_percent),
      maxChargingPowerKw: Number(vehicleRow.max_charging_power_kw),
    };

    // 2. Call Routing Service with alternatives=true to get all candidate routes
    const candidateRoutes = await getRoutes(
      body.origin_lat, body.origin_lng,
      body.dest_lat, body.dest_lng
    );

    const evaluatedStrategies: any[] = [];
    const seenStrategyKeys = new Set<string>();

    // 3. Pass each candidate route through Member 3 battery feasibility and Member 5 optimizer scoring
    for (let rIdx = 0; rIdx < candidateRoutes.length; rIdx++) {
      const route = candidateRoutes[rIdx];
      const driveTimeMins = Math.round(route.durationMinutes);

      const batteryResult = await checkReachability(
        body.vehicle_id,
        body.current_soc,
        route.distanceKm,
        vehicleProfile
      );

      const energyKwh = Number((batteryResult.energyRequiredKWh || (route.distanceKm * vehicleProfile.consumptionKwhPerKm)).toFixed(1));

      if (batteryResult.reachable) {
        // Direct route candidate
        const why = `Direct route (${route.distanceKm.toFixed(1)} km) feasible without intermediate charging (${(batteryResult.safetyMarginPercent ?? 10).toFixed(1)}% buffer above reserve).`;
        const optData = {
          totalWaitMinutes: 0,
          total_wait_minutes: 0,
          totalChargingMinutes: 0,
          total_charging_minutes: 0,
          finalSoc: Number(batteryResult.arrivalSoC.toFixed(1)),
          final_soc: Number(batteryResult.arrivalSoC.toFixed(1)),
          reason: why,
          reasons: [why],
          mode: 'DIRECT',
        };

        const stratKey = `DIRECT-${route.distanceKm.toFixed(1)}-${driveTimeMins}`;
        if (!seenStrategyKeys.has(stratKey)) {
          seenStrategyKeys.add(stratKey);
          evaluatedStrategies.push({
            id: evaluatedStrategies.length === 0 ? 'RECOMMENDED' : `DIRECT_ALT_${evaluatedStrategies.length + 1}`,
            title: evaluatedStrategies.length === 0 ? 'Recommended (Direct)' : `Alternative ${evaluatedStrategies.length + 1} (Direct Route)`,
            tag: evaluatedStrategies.length === 0 ? '⚡ DIRECT ROUTE' : '🛣️ DIRECT ALTERNATIVE',
            distanceKm: route.distanceKm,
            distance_km: route.distanceKm,
            durationMinutes: driveTimeMins,
            duration_minutes: driveTimeMins,
            totalTimeMinutes: driveTimeMins,
            total_time_minutes: driveTimeMins,
            driveTimeMinutes: driveTimeMins,
            drive_time_minutes: driveTimeMins,
            chargeTimeMinutes: 0,
            charge_time_minutes: 0,
            arrivalSoc: Number(batteryResult.arrivalSoC.toFixed(1)),
            arrival_soc: Number(batteryResult.arrivalSoC.toFixed(1)),
            energyKwh,
            energy_kwh: energyKwh,
            whyExplanation: why,
            why_explanation: why,
            battery: {
              ...batteryResult,
              safetyMarginPercent: batteryResult.safetyMarginPercent ?? 0,
            },
            optimizerData: optData,
            optimizer_data: optData,
            stops: [],
            geometry: typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry),
          });
        }
      } else {
        // Multi-Stop Optimization required for this route
        try {
          const candidateChargers = await findChargersAlongRoute(route.geometry);
          const stationIds = candidateChargers.map(c => c.id);
          const predictions = await getStationPredictions(stationIds);

          const optimizerResult = await optimizeTrip({
            origin: { lat: body.origin_lat, lng: body.origin_lng, name: 'Origin' },
            destination: { lat: body.dest_lat, lng: body.dest_lng, name: 'Destination' },
            vehicleId: body.vehicle_id,
            currentSoc: body.current_soc,
            vehicleProfile,
            candidateChargers,
            predictions,
            mode: 'BALANCED',
          });

          if (optimizerResult.status !== 'UNREACHABLE') {
            const optChargeTime = optimizerResult.totalChargingMinutes;
            const optWaitTime = optimizerResult.totalWaitMinutes || 0;
            const optDriveTime = Math.round(optimizerResult.totalDrivingDurationMinutes ?? route.durationMinutes);
            const optTotalTime = Math.round(optimizerResult.totalTripDurationMinutes ?? (optDriveTime + optChargeTime + optWaitTime));
            const optDistKm = optimizerResult.totalDistanceKm ?? route.distanceKm;
            const optArrivalSoc = optimizerResult.finalSoc;
            const optWhy = optimizerResult.reason || 'Multi-stop route optimized for minimum combined travel time and queue wait.';
            const optReasons = optimizerResult.reasons && optimizerResult.reasons.length > 0 ? optimizerResult.reasons : [optWhy];

            const formattedStops = optimizerResult.stops.map(s => ({
              ...s,
              station_id: s.stationId,
              arrival_soc: s.arrivalSoc,
              departure_soc: s.departureSoc,
              expected_wait_minutes: s.expectedWaitMinutes,
              charging_minutes: s.chargingMinutes,
              energy_added_kwh: s.energyAddedKwh ?? 0,
            }));

            const optData = {
              totalWaitMinutes: optimizerResult.totalWaitMinutes,
              total_wait_minutes: optimizerResult.totalWaitMinutes,
              totalChargingMinutes: optimizerResult.totalChargingMinutes,
              total_charging_minutes: optimizerResult.totalChargingMinutes,
              finalSoc: optArrivalSoc,
              final_soc: optArrivalSoc,
              reason: optWhy,
              reasons: optReasons,
              mode: optimizerResult.mode || 'BALANCED',
            };

            const stratKey = `MULTI-${optDistKm.toFixed(1)}-${optTotalTime}-${formattedStops.map(s => s.stationId).join(',')}`;
            if (!seenStrategyKeys.has(stratKey)) {
              seenStrategyKeys.add(stratKey);
              evaluatedStrategies.push({
                id: evaluatedStrategies.length === 0 ? 'RECOMMENDED' : `BALANCED_ALT_${evaluatedStrategies.length + 1}`,
                title: evaluatedStrategies.length === 0 ? 'Recommended (Balanced)' : `Alternative ${evaluatedStrategies.length + 1} (Corridor Route)`,
                tag: evaluatedStrategies.length === 0 ? '⚡ AI OPTIMIZED' : '🔋 CHARGING ROUTE',
                distanceKm: optDistKm,
                distance_km: optDistKm,
                durationMinutes: optDriveTime,
                duration_minutes: optDriveTime,
                totalTimeMinutes: optTotalTime,
                total_time_minutes: optTotalTime,
                driveTimeMinutes: optDriveTime,
                drive_time_minutes: optDriveTime,
                chargeTimeMinutes: optChargeTime,
                charge_time_minutes: optChargeTime,
                arrivalSoc: optArrivalSoc,
                arrival_soc: optArrivalSoc,
                energyKwh,
                energy_kwh: energyKwh,
                whyExplanation: optWhy,
                why_explanation: optWhy,
                battery: {
                  ...batteryResult,
                  arrivalSoC: optArrivalSoc,
                  reachable: true,
                  safetyMarginPercent: batteryResult.safetyMarginPercent ?? 0,
                },
                optimizerData: optData,
                optimizer_data: optData,
                stops: formattedStops,
                geometry: typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry),
              });
            }

            // Member 5 Route Alternatives
            if (optimizerResult.alternatives && optimizerResult.alternatives.length > 0) {
              for (const alt of optimizerResult.alternatives) {
                const altDrive = Math.round(alt.totalDrivingDurationMinutes || route.durationMinutes);
                const altCharge = alt.totalChargingDurationMinutes;
                const altWait = alt.totalPredictedWaitMinutes || 0;
                const altTotal = Math.round(alt.totalTripDurationMinutes || (altDrive + altCharge + altWait));
                const altDist = alt.totalDistanceKm > 0 ? alt.totalDistanceKm : route.distanceKm;
                const altStops = alt.stops.map(s => ({
                  ...s,
                  station_id: s.stationId,
                  arrival_soc: s.arrivalSoc,
                  departure_soc: s.departureSoc,
                  expected_wait_minutes: s.expectedWaitMinutes,
                  charging_minutes: s.chargingMinutes,
                  energy_added_kwh: s.energyAddedKwh ?? 0,
                }));

                const altKey = `ALT-${altDist.toFixed(1)}-${altTotal}-${altStops.map(s => s.stationId).join(',')}`;
                if (!seenStrategyKeys.has(altKey)) {
                  seenStrategyKeys.add(altKey);
                  const altWhy = alt.reason || `Alternative route with charging stops (Duration: ${altTotal} mins).`;
                  const altOptData = {
                    totalWaitMinutes: alt.totalPredictedWaitMinutes,
                    total_wait_minutes: alt.totalPredictedWaitMinutes,
                    totalChargingMinutes: alt.totalChargingDurationMinutes,
                    total_charging_minutes: alt.totalChargingDurationMinutes,
                    finalSoc: alt.destinationSoCPct,
                    final_soc: alt.destinationSoCPct,
                    reason: altWhy,
                    reasons: [altWhy],
                    mode: 'ALTERNATIVE',
                  };

                  evaluatedStrategies.push({
                    id: `ALT_${alt.rank || (evaluatedStrategies.length + 1)}`,
                    title: `Alternative ${alt.rank || (evaluatedStrategies.length + 1)}`,
                    tag: '🔀 ALT ROUTE',
                    distanceKm: altDist,
                    distance_km: altDist,
                    durationMinutes: altDrive,
                    duration_minutes: altDrive,
                    totalTimeMinutes: altTotal,
                    total_time_minutes: altTotal,
                    driveTimeMinutes: altDrive,
                    drive_time_minutes: altDrive,
                    chargeTimeMinutes: altCharge,
                    charge_time_minutes: altCharge,
                    arrivalSoc: alt.destinationSoCPct,
                    arrival_soc: alt.destinationSoCPct,
                    energyKwh: Number((altDist * vehicleProfile.consumptionKwhPerKm).toFixed(1)),
                    energy_kwh: Number((altDist * vehicleProfile.consumptionKwhPerKm).toFixed(1)),
                    whyExplanation: altWhy,
                    why_explanation: altWhy,
                    battery: {
                      ...batteryResult,
                      arrivalSoC: alt.destinationSoCPct,
                      reachable: true,
                      safetyMarginPercent: batteryResult.safetyMarginPercent ?? 0,
                    },
                    optimizerData: altOptData,
                    optimizer_data: altOptData,
                    stops: altStops,
                    geometry: typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry),
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Corridor charging optimization error for route candidate:', err);
        }
      }
    }

    if (evaluatedStrategies.length === 0) {
      throw new AppError(422, 'INSUFFICIENT_BATTERY' as any, 'Destination is not reachable even with charging stops.');
    }

    // Sort strategies: lowest total journey time first, ensure RECOMMENDED is assigned to #1
    evaluatedStrategies.sort((a, b) => a.totalTimeMinutes - b.totalTimeMinutes);
    evaluatedStrategies[0].id = 'RECOMMENDED';
    if (!evaluatedStrategies[0].title.startsWith('Recommended')) {
      evaluatedStrategies[0].title = `Recommended (${evaluatedStrategies[0].chargeTimeMinutes === 0 ? 'Direct' : 'Balanced'})`;
    }

    const winningStrategy = evaluatedStrategies[0];
    const finalStops = winningStrategy.stops;

    // Ensure stations exist in DB to prevent foreign key errors for trip_stops
    for (const stop of finalStops) {
      await query(
        `INSERT INTO charging_stations (id, name, operator, location, status)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), 'active')
         ON CONFLICT (id) DO NOTHING`,
        [
          stop.stationId || stop.station_id,
          stop.name || `Station ${(stop.stationId || stop.station_id).substring(0, 8)}`,
          'VOLT Network',
          stop.longitude,
          stop.latitude
        ]
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
        vehicleRow.id,
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
          stop.stationId || stop.station_id,
          stop.sequence,
          stop.arrivalSoc ?? stop.arrival_soc,
          stop.departureSoc ?? stop.departure_soc,
          stop.expectedWaitMinutes ?? stop.expected_wait_minutes,
          stop.chargingMinutes ?? stop.charging_minutes,
        ]
      );
    }

    return c.json({
      success: true,
      data: {
        tripId,
        trip_id: tripId,
        distanceKm: winningStrategy.distanceKm,
        distance_km: winningStrategy.distanceKm,
        durationMinutes: winningStrategy.durationMinutes,
        duration_minutes: winningStrategy.durationMinutes,
        battery: winningStrategy.battery,
        geometry: winningStrategy.geometry,
        stops: finalStops,
        optimizerData: winningStrategy.optimizerData,
        optimizer_data: winningStrategy.optimizerData,
        strategies: evaluatedStrategies,
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
