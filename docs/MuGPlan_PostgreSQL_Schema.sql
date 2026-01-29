-- ============================================================
-- MuGPlan PostgreSQL Database Schema
-- Stand: 29. Januar 2026
-- Generiert aus shared/schema.ts
-- ============================================================

BEGIN;

-- ============================================================
-- Customer - Kundenverwaltung (FT 09)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer (
  id              BIGSERIAL PRIMARY KEY,
  customer_number TEXT NOT NULL UNIQUE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  company         TEXT NULL,
  phone           TEXT NOT NULL,
  address_line1   TEXT NULL,
  address_line2   TEXT NULL,
  postal_code     TEXT NULL,
  city            TEXT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Events - Kalenderereignisse
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id    SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date  DATE NOT NULL
);

-- ============================================================
-- Tours - Tourenverwaltung (FT 03)
-- ============================================================

CREATE TABLE IF NOT EXISTS tours (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL
);

-- ============================================================
-- Teams - Teamverwaltung (FT 04)
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL
);

-- ============================================================
-- Note - Notizverwaltung (FT 13)
-- ============================================================

CREATE TABLE IF NOT EXISTS note (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Note Template - Notizvorlagen (FT 13)
-- ============================================================

CREATE TABLE IF NOT EXISTS note_template (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Customer Note - Kunden-Notizen Verknuepfung (FT 13)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_note (
  customer_id BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  note_id     BIGINT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, note_id)
);

-- ============================================================
-- Project - Projektverwaltung (FT 02)
-- ============================================================

CREATE TABLE IF NOT EXISTS project (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  customer_id    BIGINT NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  description_md TEXT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Project Note - Projekt-Notizen Verknuepfung (FT 02)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_note (
  project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  note_id    BIGINT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, note_id)
);

-- ============================================================
-- Project Attachment - Projektanhaenge (FT 02)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_attachment (
  id            BIGSERIAL PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Project Status - Projektstatusverwaltung (FT 15)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_status (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NULL,
  color       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Project <-> Project Status - Verknuepfung (FT 02/15)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_project_status (
  project_id        BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  project_status_id BIGINT NOT NULL REFERENCES project_status(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, project_status_id)
);

-- ============================================================
-- Employee - Mitarbeiterverwaltung (FT 05)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee (
  id         BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  phone      TEXT NULL,
  email      TEXT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  team_id    INTEGER NULL REFERENCES teams(id) ON DELETE SET NULL,
  tour_id    INTEGER NULL REFERENCES tours(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Help Texts - Hilfetexte (FT 16)
-- ============================================================

CREATE TABLE IF NOT EXISTS help_texts (
  id         BIGSERIAL PRIMARY KEY,
  help_key   TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customer_customer_number ON customer(customer_number);
CREATE INDEX IF NOT EXISTS idx_customer_is_active ON customer(is_active);
CREATE INDEX IF NOT EXISTS idx_project_customer_id ON project(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_is_active ON project(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_team_id ON employee(team_id);
CREATE INDEX IF NOT EXISTS idx_employee_tour_id ON employee(tour_id);
CREATE INDEX IF NOT EXISTS idx_employee_is_active ON employee(is_active);
CREATE INDEX IF NOT EXISTS idx_project_status_sort_order ON project_status(sort_order);
CREATE INDEX IF NOT EXISTS idx_project_status_is_active ON project_status(is_active);
CREATE INDEX IF NOT EXISTS idx_note_template_sort_order ON note_template(sort_order);
CREATE INDEX IF NOT EXISTS idx_help_texts_help_key ON help_texts(help_key);

COMMIT;
