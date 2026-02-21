# Performance-Deep-Dive und Indexstrategie (Read-only)

Datum: 21.02.2026  
Projekt: MuGPlan  
Status: Analysebericht ohne Implementierung

## Auftrag und Rahmen
- Ziel: Belastbare Performance- und Indexanalyse für produktive Query-Pfade.
- Verbotene Maßnahmen: Keine Codeänderung, keine Schemaänderung, keine Migration, keine DDL/DML-Ausführung.
- Wachstumsszenario: 500-1000 Termine/Jahr, Betrachtung bei 5.000 / 10.000 / 20.000 Terminen.
- Multi-User mit parallelen Schreibzugriffen und Optimistic Locking (`version`).

## Scope
- Analysiert: Produktive Tabellen und produktiver Backend-Layer.
- Fokus-Tabellen (verpflichtend):
  - `appointments`
  - `appointment_employee`
  - `project`
  - `project_project_status`
  - `employee`
- Ausgeschlossen:
  - Demo-/Seed-Kontext (`seed_run`, `seed_run_entity`, Demo-Seed-Code)
  - User-Prefs (`user_settings_value`)
  - Tests und Dev-Skripte

## Quellenbasis
- `shared/schema.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/repositories/projectsRepository.ts`
- `server/repositories/projectStatusRepository.ts`
- `server/repositories/employeesRepository.ts`
- `server/repositories/backupRuntimeRepository.ts`
- `c:\Users\schro\Downloads\mugplan_dump(1).sql`

## 1) Schema- und Indexanalyse
### 1.1 Index-Inventar (produktiv)
- `appointment_employee`: `PRIMARY(appointment_id, employee_id)`, `KEY(employee_id)`
- `appointments`: `PRIMARY(id)`, `KEY(project_id)`, `KEY(tour_id)`
- `audit_log`: `PRIMARY(id)`, `KEY(user_id)`, `KEY(entity_type, entity_id)`, `KEY(created_at)`
- `backup_log`: `PRIMARY(id)`
- `customer`: `PRIMARY(id)`, `UNIQUE(customer_number)`
- `customer_attachment`: `PRIMARY(id)`, `KEY(customer_id)`
- `customer_note`: `PRIMARY(customer_id, note_id)`, `KEY(note_id)`
- `employee`: `PRIMARY(id)`, `KEY(team_id)`, `KEY(tour_id)`
- `employee_attachment`: `PRIMARY(id)`, `KEY(employee_id)`
- `help_texts`: `PRIMARY(id)`, `UNIQUE(help_key)`
- `note`: `PRIMARY(id)`
- `note_template`: `PRIMARY(id)`
- `project`: `PRIMARY(id)`, `KEY(customer_id)`
- `project_attachment`: `PRIMARY(id)`, `KEY(project_id)`
- `project_note`: `PRIMARY(project_id, note_id)`, `KEY(note_id)`
- `project_project_status`: `PRIMARY(project_id, project_status_id)`, `KEY(project_status_id)`
- `project_status`: `PRIMARY(id)`
- `roles`: `PRIMARY(id)`, `UNIQUE(code)`
- `teams`: `PRIMARY(id)`
- `tours`: `PRIMARY(id)`
- `users`: `PRIMARY(id)`, `UNIQUE(username)`, `UNIQUE(email)`, `UNIQUE(users_username_unique)`, `UNIQUE(users_email_unique)`, `KEY(role_id)`, `KEY(created_by)`

### 1.2 Redundanzen und Hygiene
- Redundant:
  - `users.username` ist doppelt unique indiziert (`username`, `users_username_unique`)
  - `users.email` ist doppelt unique indiziert (`email`, `users_email_unique`)

### 1.3 FK-Indexierung
- FK-Spalten sind durchgängig indiziert.
- n:m-Zweitspalten sind ebenfalls vorhanden (`employee_id`, `note_id`, `project_status_id`).

### 1.4 Composite-Reihenfolge
- Join-Tabellen sind korrekt für linkspräfixbasierte Zugriffe aufgebaut:
  - `appointment_employee(appointment_id, employee_id)`
  - `project_project_status(project_id, project_status_id)`
- Ergänzende Einzelindizes auf der zweiten FK-Spalte unterstützen Gegenrichtung.

### 1.5 Write-Performance (Ist)
- `users`: unnötiger Write-Overhead durch doppelte Unique-Indizes.
- Kern-Write-Pfade (`appointments`, `appointment_employee`, `project_project_status`) sind write-seitig aktuell schlank, aber read-seitig auf Kalenderlast unterindexiert.

## 2) Query-Inventarisierung (produktiver Code)
## `appointments`
- `WHERE id = ?`
- `WHERE project_id = ? AND start_date >= ? ORDER BY start_date,start_time,id`
- `WHERE tour_id = ? AND start_date >= ? ORDER BY start_date,start_time,id`
- Kalender:
  - `WHERE start_date <= ? AND (end_date IS NULL OR end_date >= ?)`
  - optional `AND id IN (SELECT appointment_id FROM appointment_employee WHERE employee_id = ?)`
  - `ORDER BY start_date,start_time,id`
- Listen/Pagination:
  - Filterkombinationen auf `projectId/customerId/tourId/dateFrom/dateTo/allDay/withStartTime/locked`
  - optional `EXISTS` auf `appointment_employee`
  - optional `HAVING count(*)=1`
  - `ORDER BY start_date DESC,start_time DESC,id DESC LIMIT/OFFSET`
- Optimistic Locking:
  - `UPDATE ... WHERE id=? AND version=?`
  - `DELETE ... WHERE id=? AND version=?`

## `appointment_employee`
- `WHERE appointment_id = ?`
- `WHERE appointment_id IN (...)`
- `WHERE employee_id = ?`
- Join-Pattern:
  - `appointment_employee` ↔ `appointments` für Overlap-Check
- Schreibmuster:
  - Replace (`DELETE appointment_id=?` + batch `INSERT`)

## `project`
- Listen mit:
  - Aktiv/Inaktiv-Filter
  - `EXISTS/NOT EXISTS` auf `appointments`
  - `EXISTS` auf `project_project_status`
  - `ORDER BY updated_at DESC`
- Detail: `WHERE id=?`
- Optimistic Locking:
  - `UPDATE ... WHERE id=? AND version=?`
  - `DELETE ... WHERE id=? AND version=?`

## `project_project_status`
- `WHERE project_id=?` + Join `project_status` + Sortierung (`sort_order,title`)
- `WHERE project_id IN (...)` + Join
- `WHERE project_status_id=?` (in-use)
- `WHERE project_id=? AND project_status_id=?` (existence/version)
- `DELETE ... WHERE project_id=? AND project_status_id=? AND version=?`

## `employee`
- `WHERE is_active=? ORDER BY last_name,first_name,id`
- `WHERE tour_id=? ORDER BY last_name,first_name`
- `WHERE team_id=? ORDER BY last_name,first_name`
- `WHERE id=?`
- `UPDATE ... WHERE id=? AND version=?`

## 3) EXPLAIN-Befunde (Hauptqueries)
Hinweis: Aktuelle Datenlage enthält kaum/keine `appointments`; Rows-Schätzungen sind deshalb klein, Plan-Charakteristik bleibt dennoch aussagekräftig.

### Kritische Reads
- Kalender-Range (mit und ohne Mitarbeiter):
  - `appointments`: `type=ALL`, `key=null`, `Extra=Using where; Using filesort`
- Tour-/Projekt-Listen mit Datum:
  - vorhandene FK-Indizes werden genutzt (`tour_id`, `project_id`), aber weiterhin `Using filesort`
- Mitarbeiterlisten über Join:
  - `appointment_employee(employee_id)` wird verwendet, teils mit `Using temporary; Using filesort`
- Overlap-Check:
  - `appointment_employee` indexgestützt, danach `appointments` via PK (`eq_ref`) mit Restfilter

### Projekt-/Status-Reads
- `project` mit `EXISTS appointments`: temporäre/Sortierkosten sichtbar
- `project` mit Status-`EXISTS`: Index auf `project_project_status(project_status_id)` wird genutzt
- Statusrelation je Projekt: PK-Zugriff auf Join-Tabelle, Sortierung über Statusfelder erzeugt häufig Temp/Filesort

### Employee-Reads
- Aktive Mitarbeiterliste:
  - `type=ALL`, `key=null`, `Using where; Using filesort`
- Nach Team/Tour:
  - FK-Indizes genutzt, aber sortierbedingt weiterhin Filesort

### Optimistic-Locking-Reads/Writes
- `UPDATE/DELETE ... WHERE id AND version`:
  - PK-basiert, `Using where`
- `DELETE project_project_status WHERE project_id AND project_status_id AND version`:
  - PK-basiert, `Using where`
- Bewertung: Locking-Muster sind indexseitig ausreichend.

## 4) Kalender-Lastanalyse (5k / 10k / 20k)
- Ist-Zustand: Kalender-Hotpaths scannen und sortieren über `appointments`.
- Erwartung:
  - 5k: grundsätzlich nutzbar, aber erste Latenzspitzen bei Monatsansichten/Filtern.
  - 10k: deutliche Verschlechterung unter Parallelität.
  - 20k: hohe Volatilität, CPU-/Sort-Last und Response-Jitter wahrscheinlich.
- Treiber: fehlende führende Datums-/Sortier-Kompositindizes.

## 5) Join-Performance und N+1
- Join-Pfade sind strukturell korrekt:
  - `appointments ↔ appointment_employee ↔ employee`
  - `project ↔ project_project_status ↔ project_status`
- Kein dominantes N+1 im Kalender-Hotpath (Mitarbeiter/Status werden gebündelt nachgeladen).
- Primärer Engpass ist die zu große Kandidatenmenge vor Join durch schwache Filter-/Sortierabdeckung.

## 6) Sortierung und Pagination
- Kritisch:
  - `ORDER BY start_date,start_time,id` (asc/desc) in Kombination mit `LIMIT/OFFSET`.
- Ohne passende Kompositindizes entsteht Filesort; große Offsets werden zunehmend teuer.

## 7) Maßnahmenkatalog (nur Vorschläge, keine Ausführung)
## Zwingend erforderlich
1. Kalender-/Listenindex global:
```sql
CREATE INDEX idx_appointments_start_time_id
ON appointments (start_date, start_time, id);
```
2. Tourgebundene Kalenderabfragen:
```sql
CREATE INDEX idx_appointments_tour_start_time_id
ON appointments (tour_id, start_date, start_time, id);
```
3. Projektgebundene Terminlisten:
```sql
CREATE INDEX idx_appointments_project_start_time_id
ON appointments (project_id, start_date, start_time, id);
```
4. Redundante User-Unique-Indizes bereinigen:
```sql
ALTER TABLE users DROP INDEX users_username_unique;
ALTER TABLE users DROP INDEX users_email_unique;
```

## Empfohlen bei Wachstum
1. Mitarbeiterfilter + Join stabilisieren:
```sql
CREATE INDEX idx_appointment_employee_emp_appt
ON appointment_employee (employee_id, appointment_id);
```
2. Employee-Listen ohne Filesort:
```sql
CREATE INDEX idx_employee_active_name
ON employee (is_active, last_name, first_name, id);

CREATE INDEX idx_employee_tour_name
ON employee (tour_id, last_name, first_name, id);

CREATE INDEX idx_employee_team_name
ON employee (team_id, last_name, first_name, id);
```
3. Projektlisten:
```sql
CREATE INDEX idx_project_customer_active_updated
ON project (customer_id, is_active, updated_at, id);

CREATE INDEX idx_project_active_updated
ON project (is_active, updated_at, id);
```

## Optional
1. Statussortierung:
```sql
CREATE INDEX idx_project_status_sort_title
ON project_status (sort_order, title, id);
```
2. Attachment-Listen:
```sql
CREATE INDEX idx_project_attachment_project_created
ON project_attachment (project_id, created_at);

CREATE INDEX idx_customer_attachment_customer_created
ON customer_attachment (customer_id, created_at);

CREATE INDEX idx_employee_attachment_employee_created
ON employee_attachment (employee_id, created_at);
```

## 8) Risikobewertung
- Write-Overhead:
  - Höchster Effekt bei zusätzlichen `appointments`-Kompositindizes.
- Speicher:
  - Mehrspaltige Indizes erhöhen Indexgröße merklich bei 10k/20k Terminen.
- Migration/DDL-Risiko:
  - Für spätere Umsetzung Online-DDL-Strategie und Wartungsfenster einplanen.

## 9) Priorisierung (Kurzmatrix)
- Zwingend:
  - `appointments` Kompositindizes (Datum/Sortierung + Tour + Projekt)
  - Redundante `users`-Unique-Indizes entfernen
- Empfohlen:
  - `appointment_employee(employee_id, appointment_id)`
  - `employee` Sortier-/Filter-Kompositindizes
  - `project` Listen-Kompositindizes
- Optional:
  - `project_status` Sortierindex
  - Attachment-Sortierindizes

## 10) Validierung für spätere Umsetzung
- Vorher/Nachher-`EXPLAIN` auf:
  - Kalenderrange, Tour-/Projekt-/Mitarbeiterlisten, Overlap-Check, Projektlisten, Employee-Listen
- Lasttests:
  - 5k / 10k / 20k Termine mit parallelen Lese-/Schreibmustern
- Akzeptanz:
  - kritische Pfade ohne vermeidbare Full-Scans
  - deutliche Reduktion von `Using filesort`/`Using temporary`
  - keine unvertretbare Verschlechterung der Write-Latenz

---
Hinweis: Dieser Report ist rein analytisch. Es wurden keine Änderungen an Code, Schema oder Datenbank vorgenommen.
