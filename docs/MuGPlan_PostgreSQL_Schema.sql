-- ============================================================
-- MuGPlan / Tour-Master – PostgreSQL Schema (konsolidiert)
-- Stand: Projektzentriert, Terminplanung, Tour + Teams + Notizen
--        inkl. Notizvorlagen und Pinning
-- ============================================================

BEGIN;

-- ============================================================
-- Stammdaten: Kunden
-- ============================================================

CREATE TABLE IF NOT EXISTS customer (
  id              BIGSERIAL PRIMARY KEY,
  customer_number TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
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
-- Stammdaten: Projektstatus
-- ============================================================

CREATE TABLE IF NOT EXISTS project_status (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Stammdaten: Touren
-- ============================================================

CREATE TABLE IF NOT EXISTS tour (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  description TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Stammdaten: Teams (Eingabehilfen für Mitarbeiterzuweisung)
-- ============================================================

CREATE TABLE IF NOT EXISTS team (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Stammdaten: Mitarbeiter
-- ============================================================

CREATE TABLE IF NOT EXISTS employee (
  id         BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  tour_id    BIGINT NULL,
  team_id    BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_employee_tour
    FOREIGN KEY (tour_id)
    REFERENCES tour(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_employee_team
    FOREIGN KEY (team_id)
    REFERENCES team(id)
    ON DELETE SET NULL
);

-- ============================================================
-- Projekte
-- ============================================================

CREATE TABLE IF NOT EXISTS project (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     BIGINT NOT NULL,
  title           TEXT NOT NULL,
  description_md  TEXT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_project_customer
    FOREIGN KEY (customer_id)
    REFERENCES customer(id)
    ON DELETE RESTRICT
);

-- ============================================================
-- Relation: Projekt <-> Projektstatus (n:m)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_project_status (
  project_id        BIGINT NOT NULL,
  project_status_id BIGINT NOT NULL,
  PRIMARY KEY (project_id, project_status_id),
  CONSTRAINT fk_pps_project
    FOREIGN KEY (project_id)
    REFERENCES project(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pps_status
    FOREIGN KEY (project_status_id)
    REFERENCES project_status(id)
    ON DELETE RESTRICT
);

-- ============================================================
-- Termine
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NULL,
  tour_id    BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_appointment_project
    FOREIGN KEY (project_id)
    REFERENCES project(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_tour
    FOREIGN KEY (tour_id)
    REFERENCES tour(id)
    ON DELETE SET NULL,
  CONSTRAINT chk_appointment_date_range
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- Relation: Termin <-> Mitarbeiter (n:m)
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_employee (
  appointment_id BIGINT NOT NULL,
  employee_id    BIGINT NOT NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (appointment_id, employee_id),
  CONSTRAINT fk_ae_appointment
    FOREIGN KEY (appointment_id)
    REFERENCES appointment(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ae_employee
    FOREIGN KEY (employee_id)
    REFERENCES employee(id)
    ON DELETE RESTRICT
);

-- ============================================================
-- Notizen (gemeinsames Domainobjekt)
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
-- Stammdaten: Notizvorlagen
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
-- Relation: Projekt <-> Notiz (n:m)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_note (
  project_id BIGINT NOT NULL,
  note_id    BIGINT NOT NULL,
  PRIMARY KEY (project_id, note_id),
  CONSTRAINT fk_project_note_project
    FOREIGN KEY (project_id)
    REFERENCES project(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_note_note
    FOREIGN KEY (note_id)
    REFERENCES note(id)
    ON DELETE CASCADE
);

-- ============================================================
-- Relation: Kunde <-> Notiz (n:m)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_note (
  customer_id BIGINT NOT NULL,
  note_id     BIGINT NOT NULL,
  PRIMARY KEY (customer_id, note_id),
  CONSTRAINT fk_customer_note_customer
    FOREIGN KEY (customer_id)
    REFERENCES customer(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_customer_note_note
    FOREIGN KEY (note_id)
    REFERENCES note(id)
    ON DELETE CASCADE
);

-- ============================================================
-- Projekt-Anhänge
-- ============================================================

CREATE TABLE IF NOT EXISTS project_attachment (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL,
  file_name   TEXT NOT NULL,
  mime_type   TEXT NULL,
  file_path   TEXT NULL,
  description TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_project_attachment_project
    FOREIGN KEY (project_id)
    REFERENCES project(id)
    ON DELETE CASCADE
);

-- ============================================================
-- Abwesenheiten
-- ============================================================

CREATE TABLE IF NOT EXISTS absence (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_absence_employee
    FOREIGN KEY (employee_id)
    REFERENCES employee(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_absence_date_range
    CHECK (end_date >= start_date)
);

COMMIT;
