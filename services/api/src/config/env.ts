// ──────────────────────────────────────────────
// Environment Configuration
// Zod-validated environment variables with
// sensible development fallbacks and multi-path dotenv.
// ──────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load .env from current directory first, or monorepo root
const cwdEnv = path.resolve(process.cwd(), '.env');
const rootEnv = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(cwdEnv)) {
  dotenv.config({ path: cwdEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // PostgreSQL
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/volt_dev'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Firebase Admin SDK (with dev defaults)
  FIREBASE_PROJECT_ID: z.string().default('volt-dev'),
  FIREBASE_CLIENT_EMAIL: z.string().default('firebase-adminsdk@volt-dev.iam.gserviceaccount.com'),
  FIREBASE_PRIVATE_KEY: z.string().default('-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----'),

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
