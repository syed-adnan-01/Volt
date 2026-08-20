// ──────────────────────────────────────────────
// Environment Configuration
// Zod-validated environment variables.
// Fails fast on startup if anything is missing.
// ──────────────────────────────────────────────

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // PostgreSQL
  DATABASE_URL: z.string().url().startsWith('postgresql'),

  // Redis
  REDIS_URL: z.string().min(1),

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // External service URLs
  OSRM_BASE_URL: z.string().url().default('http://localhost:5000'),
  CHARGER_API_URL: z.string().url().default('http://localhost:4001'),
  ML_API_URL: z.string().url().default('http://localhost:4002'),
  BATTERY_SERVICE_URL: z.string().url().default('http://localhost:4003'),
  OPTIMIZER_SERVICE_URL: z.string().url().default('http://localhost:4004'),

  // Logging
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
