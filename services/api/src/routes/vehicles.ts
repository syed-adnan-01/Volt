// ──────────────────────────────────────────────
// Vehicles Routes
// Handles CRUD for user vehicles.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { LocalUserContext } from '../integrations/firebase/userSync.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCode } from '@volt/contracts';

type Variables = {
  requestId: string;
  user: LocalUserContext;
};

const vehiclesRouter = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes in this router
vehiclesRouter.use('*', requireAuth);

// ── GET /vehicles ──────────────────────────────
vehiclesRouter.get('/', async (c) => {
  const user = c.get('user');

  const result = await query(
    `SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );

  return c.json({
    success: true,
    data: result.rows,
    error: null,
    meta: {
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
  });
});

// ── GET /vehicles/:id ──────────────────────────
vehiclesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const vehicleId = c.req.param('id');

  const result = await query(
    `SELECT * FROM vehicles WHERE id = $1 AND user_id = $2`,
    [vehicleId, user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'VEHICLE_NOT_FOUND' as any, 'Vehicle not found or not owned by user.');
  }

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

// ── POST /vehicles ─────────────────────────────
const postVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  battery_capacity_kwh: z.number().positive(),
  usable_capacity_kwh: z.number().positive(),
  consumption_kwh_per_km: z.number().positive(),
  max_charging_power_kw: z.number().positive(),
  battery_health_percent: z.number().min(0).max(100).optional().default(100),
  reserve_soc_percent: z.number().min(0).max(100).optional().default(10),
});

vehiclesRouter.post(
  '/',
  zValidator('json', postVehicleSchema),
  async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    const result = await query(
      `INSERT INTO vehicles (
         user_id, make, model, battery_capacity_kwh, usable_capacity_kwh,
         consumption_kwh_per_km, max_charging_power_kw, battery_health_percent, reserve_soc_percent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.id,
        body.make,
        body.model,
        body.battery_capacity_kwh,
        body.usable_capacity_kwh,
        body.consumption_kwh_per_km,
        body.max_charging_power_kw,
        body.battery_health_percent,
        body.reserve_soc_percent,
      ]
    );

    return c.json({
      success: true,
      data: result.rows[0],
      error: null,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    }, 201);
  }
);

// ── PATCH /vehicles/:id ────────────────────────
const patchVehicleSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  battery_capacity_kwh: z.number().positive().optional(),
  usable_capacity_kwh: z.number().positive().optional(),
  consumption_kwh_per_km: z.number().positive().optional(),
  max_charging_power_kw: z.number().positive().optional(),
  battery_health_percent: z.number().min(0).max(100).optional(),
  reserve_soc_percent: z.number().min(0).max(100).optional(),
});

vehiclesRouter.patch(
  '/:id',
  zValidator('json', patchVehicleSchema),
  async (c) => {
    const user = c.get('user');
    const vehicleId = c.req.param('id');
    const body = c.req.valid('json');

    // Make sure it exists and belongs to the user
    const checkResult = await query(
      `SELECT id FROM vehicles WHERE id = $1 AND user_id = $2`,
      [vehicleId, user.id]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND' as any, 'Vehicle not found or not owned by user.');
    }

    const result = await query(
      `UPDATE vehicles
       SET make = COALESCE($1, make),
           model = COALESCE($2, model),
           battery_capacity_kwh = COALESCE($3, battery_capacity_kwh),
           usable_capacity_kwh = COALESCE($4, usable_capacity_kwh),
           consumption_kwh_per_km = COALESCE($5, consumption_kwh_per_km),
           max_charging_power_kw = COALESCE($6, max_charging_power_kw),
           battery_health_percent = COALESCE($7, battery_health_percent),
           reserve_soc_percent = COALESCE($8, reserve_soc_percent),
           updated_at = now()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        body.make ?? null,
        body.model ?? null,
        body.battery_capacity_kwh ?? null,
        body.usable_capacity_kwh ?? null,
        body.consumption_kwh_per_km ?? null,
        body.max_charging_power_kw ?? null,
        body.battery_health_percent ?? null,
        body.reserve_soc_percent ?? null,
        vehicleId,
        user.id,
      ]
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

// ── DELETE /vehicles/:id ───────────────────────
vehiclesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const vehicleId = c.req.param('id');

  const result = await query(
    `DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id`,
    [vehicleId, user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'VEHICLE_NOT_FOUND' as any, 'Vehicle not found or not owned by user.');
  }

  return c.json({
    success: true,
    data: { deleted: true, id: result.rows[0].id },
    error: null,
    meta: {
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
  });
});

export default vehiclesRouter;
