-- ──────────────────────────────────────────────
-- Migration 005: Create Trip Tables
-- trips, trip_stops
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id   UUID           NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  origin       GEOGRAPHY(Point, 4326) NOT NULL,
  destination  GEOGRAPHY(Point, 4326) NOT NULL,
  status       VARCHAR(20)    NOT NULL DEFAULT 'planned',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_status ON trips (user_id, status);

-- Ordered charging stops within a trip
CREATE TABLE IF NOT EXISTS trip_stops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  station_id            UUID        NOT NULL REFERENCES charging_stations(id),
  sequence              INT         NOT NULL,
  arrival_soc           NUMERIC(5,2),
  departure_soc         NUMERIC(5,2),
  expected_wait_minutes NUMERIC(6,1),
  charging_minutes      NUMERIC(6,1),
  status                VARCHAR(20) NOT NULL DEFAULT 'planned'
);

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_seq ON trip_stops (trip_id, sequence);
