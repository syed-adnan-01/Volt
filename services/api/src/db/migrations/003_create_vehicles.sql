-- ──────────────────────────────────────────────
-- Migration 003: Create Vehicles Table
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make                    VARCHAR(100) NOT NULL,
  model                   VARCHAR(100) NOT NULL,
  battery_capacity_kwh    NUMERIC(6,2) NOT NULL,
  usable_capacity_kwh     NUMERIC(6,2) NOT NULL,
  consumption_kwh_per_km  NUMERIC(6,4) NOT NULL,
  battery_health_percent  NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  reserve_soc_percent     NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  max_charging_power_kw   NUMERIC(6,2) NOT NULL,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles (user_id);
