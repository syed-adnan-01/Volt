// ──────────────────────────────────────────────
// Hono Application
// Central app instance — applies global middleware
// and mounts route groups.
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoute from './routes/health.js';
import usersRouter from './routes/users.js';
import vehiclesRouter from './routes/vehicles.js';
import tripsRouter from './routes/trips.js';

// Create the Hono app with typed variables
type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// ── Global Middleware ────────────────────────
app.use('*', cors());
app.use('*', requestLogger);

// ── Global Error Handler ────────────────────
app.onError(errorHandler);

// ── Routes ──────────────────────────────────
app.route('/health', healthRoute);
app.route('/users', usersRouter);
app.route('/vehicles', vehiclesRouter);
app.route('/trips', tripsRouter);

export default app;
