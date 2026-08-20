// ──────────────────────────────────────────────
// Database Migration Runner
// Executes SQL migration files in order.
// Tracks applied migrations in a _migrations table.
// Usage: npx tsx src/db/migrate.ts
// ──────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM _migrations ORDER BY id',
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Read and sort migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`  ✅ ${file} applied`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ ${file} failed:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`\n✅ Migrations complete. ${count} new migration(s) applied.`);
}

// Run when invoked directly
runMigrations()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => closePool());
