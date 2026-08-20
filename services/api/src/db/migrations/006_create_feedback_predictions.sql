-- ──────────────────────────────────────────────
-- Migration 006: Create Feedback & Predictions
-- user_feedback, predictions
-- ──────────────────────────────────────────────

-- User-submitted charger observations
CREATE TABLE IF NOT EXISTS user_feedback (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id             UUID        NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
  trip_id                UUID        REFERENCES trips(id) ON DELETE SET NULL,
  availability_observed  BOOLEAN,
  wait_minutes           NUMERIC(6,1),
  queue_condition        VARCHAR(20),
  charger_working        BOOLEAN,
  rating                 SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  comment                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_station_time
  ON user_feedback (station_id, created_at);

-- ML prediction records (for evaluation against actual outcomes)
CREATE TABLE IF NOT EXISTS predictions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id               UUID          NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
  model_version            VARCHAR(50)   NOT NULL,
  availability_probability NUMERIC(4,3)  NOT NULL,
  expected_wait_minutes    NUMERIC(6,1)  NOT NULL,
  reliability_score        NUMERIC(4,3)  NOT NULL,
  confidence               NUMERIC(4,3)  NOT NULL,
  input_timestamp          TIMESTAMPTZ   NOT NULL,
  prediction_timestamp     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_station_time
  ON predictions (station_id, prediction_timestamp);
