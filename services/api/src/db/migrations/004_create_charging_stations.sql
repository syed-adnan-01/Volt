-- ──────────────────────────────────────────────
-- Migration 004: Create Charging Station Tables
-- charging_stations, connectors, station_status
-- ──────────────────────────────────────────────

-- Charging stations with PostGIS geography column
CREATE TABLE IF NOT EXISTS charging_stations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  VARCHAR(255),
  name         VARCHAR(255) NOT NULL,
  operator     VARCHAR(255),
  location     GEOGRAPHY(Point, 4326) NOT NULL,
  address      TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'unknown',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Spatial index for geographic queries (e.g. "chargers within X km")
CREATE INDEX IF NOT EXISTS idx_charging_stations_location
  ON charging_stations USING GIST (location);

-- Connectors per station
CREATE TABLE IF NOT EXISTS connectors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id      UUID        NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
  connector_type  VARCHAR(50) NOT NULL,
  power_kw        NUMERIC(6,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_connectors_station_id ON connectors (station_id);

-- Station status observations (time-series)
CREATE TABLE IF NOT EXISTS station_status (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id            UUID        NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
  available_connectors  INT         NOT NULL DEFAULT 0,
  occupied_connectors   INT         NOT NULL DEFAULT 0,
  status                VARCHAR(20) NOT NULL DEFAULT 'unknown',
  source                VARCHAR(30) NOT NULL DEFAULT 'SYSTEM_OBSERVATION',
  observed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_station_status_station_observed
  ON station_status (station_id, observed_at);
