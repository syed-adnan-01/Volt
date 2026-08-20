-- ──────────────────────────────────────────────
-- Migration 002: Create Users Table
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  VARCHAR(128) NOT NULL UNIQUE,
  email         VARCHAR(255),
  name          VARCHAR(255),
  phone         VARCHAR(20),
  role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
