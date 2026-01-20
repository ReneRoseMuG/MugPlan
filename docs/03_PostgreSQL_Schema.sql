-- Lastenheft – PostgreSQL DDL (Grundlage für DB-Konfiguration)
-- Stand: FT (01)–FT (13) + Note-Entscheidung (note + project_note + customer_note)

-- Hinweis:
-- Die harte Regel „Mitarbeiter darf sich zeitlich nicht überschneiden“ ist fachlich zwingend,
-- wird in der Praxis per Transaktionsprüfung oder Trigger umgesetzt.

-- =========================================
-- Stammdaten
-- =========================================

CREATE TABLE customer (
  id              uuid PRIMARY KEY,
  first_name      text NOT NULL DEFAULT '',
  last_name       text NOT NULL DEFAULT '',
  full_name       text NOT NULL,           -- regelbasierte Zusammenfassung
  phone           text NOT NULL,
  street          text NOT NULL DEFAULT '',
  zip             text NOT NULL DEFAULT '',
  city            text NOT NULL DEFAULT '',
  is_active       boolean NOT NULL DEFAULT true
);

CREATE TABLE project_status (
  id              uuid PRIMARY KEY,
  name            text NOT NULL UNIQUE,
  sort_order      integer NOT NULL DEFAULT 0,
  is_default      boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true
);

CREATE TABLE tour (
  id              uuid PRIMARY KEY,
  name            text NOT NULL UNIQUE,
  color_hex       text NOT NULL            -- z.B. '#RRGGBB'
);

CREATE TABLE employee (
  id              uuid PRIMARY KEY,
  first_name      text NOT NULL DEFAULT '',
  last_name       text NOT NULL DEFAULT '',
  is_active       boolean NOT NULL DEFAULT true
);

-- =========================================
-- Zentrale Einheit: Projekt
-- =========================================

CREATE TABLE project (
  id                   uuid PRIMARY KEY,
  customer_id           uuid NOT NULL REFERENCES customer(id),
  status_id             uuid NOT NULL REFERENCES project_status(id),
  title                 text NOT NULL,
  description_markdown  text NULL,
  is_active             boolean NOT NULL DEFAULT true
);

-- Projekt-Anhänge (0..n)
CREATE TABLE project_attachment (
  id          uuid PRIMARY KEY,
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  file_name   text NOT NULL,
  mime_type   text NOT NULL DEFAULT 'application/octet-stream',
  file_bytes  bytea NOT NULL
);

-- =========================================
-- Notizen (gemeinsames Domainobjekt)
-- =========================================

CREATE TABLE note (
  id    uuid PRIMARY KEY,
  text  text NOT NULL
);

-- Projekt ↔ Note (n:m)
CREATE TABLE project_note (
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  note_id     uuid NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, note_id)
);

-- Kunde ↔ Note (n:m)
CREATE TABLE customer_note (
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  note_id     uuid NOT NULL REFERENCES note(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, note_id)
);

-- =========================================
-- Termine (reine Zeitplanung) + Zuweisungen
-- =========================================

CREATE TABLE appointment (
  id          uuid PRIMARY KEY,
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE RESTRICT,
  start_date  date NOT NULL,
  end_date    date NULL,
  tour_id     uuid NULL REFERENCES tour(id),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- n:m Termin ↔ Mitarbeiter
CREATE TABLE appointment_employee (
  appointment_id uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  employee_id    uuid NOT NULL REFERENCES employee(id),
  PRIMARY KEY (appointment_id, employee_id)
);

-- =========================================
-- Abwesenheiten (Urlaub/Krankheit)
-- =========================================

CREATE TABLE absence (
  id          uuid PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  type        text NOT NULL,
  CHECK (end_date >= start_date),
  CHECK (type IN ('Urlaub', 'Krankheit'))
);

-- =========================================
-- Team-Vorlagen (Eingabehilfe)
-- =========================================

CREATE TABLE team_template (
  id    uuid PRIMARY KEY,
  name  text NOT NULL UNIQUE
);

CREATE TABLE team_template_member (
  team_template_id uuid NOT NULL REFERENCES team_template(id) ON DELETE CASCADE,
  employee_id      uuid NOT NULL REFERENCES employee(id),
  PRIMARY KEY (team_template_id, employee_id)
);

-- =========================================
-- Indizes (typische Abfragen)
-- =========================================

CREATE INDEX idx_project_customer ON project(customer_id);
CREATE INDEX idx_project_status ON project(status_id);

CREATE INDEX idx_appointment_project ON appointment(project_id);
CREATE INDEX idx_appointment_tour ON appointment(tour_id);
CREATE INDEX idx_appointment_start ON appointment(start_date);
CREATE INDEX idx_appointment_range ON appointment(start_date, end_date);

CREATE INDEX idx_appoint_emp_employee ON appointment_employee(employee_id);

CREATE INDEX idx_absence_employee ON absence(employee_id);
CREATE INDEX idx_absence_range ON absence(start_date, end_date);

CREATE INDEX idx_project_note_note ON project_note(note_id);
CREATE INDEX idx_customer_note_note ON customer_note(note_id);
