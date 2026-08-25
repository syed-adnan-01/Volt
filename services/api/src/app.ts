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
import stationsRouter from './routes/stations.js';
import feedbackRouter from './routes/feedback.js';
import { rateLimit } from './middleware/rateLimit.js';

// Create the Hono app with typed variables
type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// ── Global Middleware ────────────────────────
app.use('*', cors());
app.use('*', requestLogger);

// Apply rate limiting to all API routes
app.use('*', rateLimit({ windowMs: 60 * 1000, max: 100 }));

// ── Global Error Handler ────────────────────
app.onError(errorHandler);

// ── Routes ──────────────────────────────────
app.route('/health', healthRoute);
app.route('/users', usersRouter);
app.route('/vehicles', vehiclesRouter);
app.route('/trips', tripsRouter);
app.route('/stations', stationsRouter);
app.route('/stations', feedbackRouter); // mounted at /stations so /stations/:id/feedback works

export default app;
