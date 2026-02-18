# 2026-02-14 – Systemweiter Multi-User / Parallelitäts-Audit

## Auftrag
Systematische Analyse der Backend-Mutationspfade auf Multi-User-Sicherheit (keine Implementierungsänderungen), mit Fokus auf:
- LOST_UPDATE
- RACE_CONDITION
- UNSAFE_JOIN
- UNSAFE_BATCH
- INCONSISTENT_ERROR

## Analysebasis
- `server/controllers/`
- `server/services/`
- `server/repositories/`
- `shared/routes.ts`
- alle mutierenden SQL-/ORM-Writes, Tx-Verwendung und Batch-Pfade

## 1) Mutationsendpunkte – Abdeckungsmatrix

| Endpoint | Tabelle(n) | Version geschützt | Transaktion | Risiko | Bewertung |
|---|---|---|---|---|---|
| `POST /api/appointments` | `appointments`, `appointment_employee` | Insert (v1 default) | Ja | niedrig | OK |
| `PATCH /api/appointments/:id` | `appointments`, `appointment_employee` | Ja (`WHERE id AND version`) | Ja | niedrig | OK |
| `DELETE /api/appointments/:id` | `appointments` | Ja (`WHERE id AND version`) | Ja | niedrig | OK |
| `POST /api/customers` | `customer` | Insert (v1 default) | Nein | niedrig | OK |
| `PATCH /api/customers/:id` | `customer` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/projects` | `project` | Insert (v1 default) | Nein | niedrig | OK |
| `PATCH /api/projects/:id` | `project` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `DELETE /api/projects/:id` | `project`, `project_note`, `project_attachment`, `project_project_status` | Ja (versionierter Delete) | Ja | niedrig | OK |
| `POST /api/employees` | `employee` | Insert (v1 default) | Nein | niedrig | OK |
| `PUT /api/employees/:id` | `employee` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `PATCH /api/employees/:id/active` | `employee` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/teams` | `teams` | Insert (v1 default) | Nein | niedrig | OK |
| `PATCH /api/teams/:id` | `teams` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `DELETE /api/teams/:id` | `teams` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/tours` | `tours` | Insert (v1 default) | Nein | niedrig | OK |
| `PATCH /api/tours/:id` | `tours` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `DELETE /api/tours/:id` | `tours` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `PUT /api/notes/:noteId` | `note` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `PATCH /api/notes/:noteId/pin` | `note` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/customers/:customerId/notes` | `note`, `customer_note` | Insert (kein Version-Check) | Nein | hoch | Kein Tx über 2 Writes |
| `DELETE /api/customers/:customerId/notes/:noteId` | `note`, `customer_note`, `project_note` | Ja (auf `note`) | Ja | hoch | Pfadgebundene Relation wird global gelöscht |
| `POST /api/projects/:projectId/notes` | `note`, `project_note` | Insert (kein Version-Check) | Nein | hoch | Kein Tx über 2 Writes |
| `DELETE /api/projects/:projectId/notes/:noteId` | `note`, `project_note`, `customer_note` | Ja (auf `note`) | Ja | hoch | Pfadgebundene Relation wird global gelöscht |
| `POST /api/note-templates` | `note_template` | Insert (v1 default) | Nein | niedrig | OK |
| `PUT /api/note-templates/:id` | `note_template` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `DELETE /api/note-templates/:id` | `note_template` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/help-texts` | `help_texts` | Insert (v1 default) | Nein | niedrig | OK |
| `PUT /api/help-texts/:id` | `help_texts` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `PATCH /api/help-texts/:id/active` | `help_texts` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `DELETE /api/help-texts/:id` | `help_texts` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `POST /api/project-status` | `project_status` | Insert (v1 default) | Nein | niedrig | OK |
| `PUT /api/project-status/:id` | `project_status` | Ja | Nein | mittel | Optionaler Legacy-Fallback + Vorprüfungen außerhalb Tx |
| `PATCH /api/project-status/:id/active` | `project_status` | Ja | Nein | mittel | Optionaler Legacy-Fallback + Vorprüfungen außerhalb Tx |
| `DELETE /api/project-status/:id` | `project_status` | Ja | Nein | mittel | Vorprüfungen außerhalb Tx (Race möglich) |
| `POST /api/projects/:projectId/statuses` | `project_project_status` | Nein (Insert ohne erwartete Version) | Nein | mittel | TOCTOU (select-then-insert) |
| `DELETE /api/projects/:projectId/statuses/:statusId` | `project_project_status` | Ja (`... AND version`) | Nein | mittel | Existenz/Version differenziert, aber keine Parent-Tx |
| `POST /api/tours/:tourId/employees` | `employee` (mehrere Rows) | Ja (`items[].version`) | Ja | niedrig | OK |
| `DELETE /api/tours/:tourId/employees/:employeeId` | `employee` | Ja | Nein | niedrig | OK |
| `POST /api/teams/:teamId/employees` | `employee` (mehrere Rows) | Ja (`items[].version`) | Ja | niedrig | OK |
| `DELETE /api/teams/:teamId/employees/:employeeId` | `employee` | Ja | Nein | niedrig | OK |
| `PATCH /api/users/:id` | `users` | Ja | Nein | mittel | Optionaler Legacy-Fallback im Service |
| `PATCH /api/user-settings` | `user_settings_value` | Ja (versionierter Update) | Nein | hoch | Upsert-Race bei Insert-Pfad |
| `POST /api/projects/:projectId/attachments` | `project_attachment` | Insert | Nein | niedrig | OK |
| `POST /api/customers/:customerId/attachments` | `customer_attachment` | Insert | Nein | niedrig | OK |
| `POST /api/employees/:employeeId/attachments` | `employee_attachment` | Insert | Nein | niedrig | OK |
| `POST /api/admin/demo-seed-runs` | viele Domänentabellen | Nein | Teilweise (kein globales Tx) | hoch | UNSAFE_BATCH/Partial-State-Risiko |
| `DELETE /api/admin/demo-seed-runs/:seedRunId` | viele Domänentabellen | Nein | Ja | mittel | Technischer Admin-Flow |
| `POST /api/admin/reset-database` | viele Domänentabellen | Nein | Ja | mittel | Technischer Admin-Flow |

## 2) Identifizierte Risiken

### R1
- **Art:** `LOST_UPDATE`
- **Stufe:** Hoch
- **Beschreibung:** Services erlauben weiterhin Legacy-Pfade ohne Version (`if version fehlt -> unversioniertes Update/Delete`).
- **Code:** `server/services/customersService.ts:32`, `server/services/projectsService.ts:49`, `server/services/employeesService.ts:46`, `server/services/teamsService.ts:36`, `server/services/toursService.ts:36`, `server/services/notesService.ts:15`, `server/services/noteTemplatesService.ts:27`, `server/services/helpTextsService.ts:36`, `server/services/projectStatusService.ts:27`, `server/services/usersService.ts:31`
- **Kommentar:** Über aktuelle HTTP-Contracts meist abgesichert, aber intern weiter umgehbar.

### R2
- **Art:** `LOST_UPDATE`
- **Stufe:** Hoch
- **Beschreibung:** `storage`-Interface exponiert mutierende Methoden ohne Versionsparameter und delegiert teils auf unversionierte Pfade.
- **Code:** `server/storage.ts:48`, `server/storage.ts:157`, `server/storage.ts:174`, `server/storage.ts:218`, `server/storage.ts:300`, `server/storage.ts:304`, `server/storage.ts:324`, `server/storage.ts:328`
- **Kommentar:** Aktuell nicht als API-Router genutzt, aber als interner Bypass vorhanden.

### R3
- **Art:** `UNSAFE_JOIN`
- **Stufe:** Hoch
- **Beschreibung:** Note-Erzeugung mit Join-Insert ohne Transaktion (2 Writes, kein atomarer Schutz).
- **Code:** `server/services/customerNotesService.ts:13`, `server/services/projectNotesService.ts:10`
- **Kommentar:** Bei Fehler zwischen Note-Insert und Join-Insert droht Teilzustand.

### R4
- **Art:** `UNSAFE_JOIN`
- **Stufe:** Hoch
- **Beschreibung:** Relation-Delete-Endpunkte löschen über `notesService.deleteNote(...)` die Note global inkl. aller Relationen, nicht nur im Pfadkontext.
- **Code:** `server/controllers/customerNotesController.ts:46`, `server/controllers/projectNotesController.ts:42`, `server/repositories/notesRepository.ts:110`
- **Kommentar:** Semantisch riskant für relationale Integrität bei konkurrierenden Nutzeraktionen.

### R5
- **Art:** `RACE_CONDITION`
- **Stufe:** Mittel
- **Beschreibung:** `project_project_status` Add nutzt `SELECT`-then-`INSERT` ohne Tx/Version-Schutz.
- **Code:** `server/repositories/projectStatusRepository.ts:152`
- **Kommentar:** TOCTOU möglich; konkurrierende Inserts können in DB-Constraint-Fehler laufen.

### R6
- **Art:** `RACE_CONDITION`
- **Stufe:** Hoch
- **Beschreibung:** User-Settings-Upsert macht `versioniertes UPDATE` -> Existenzcheck -> `INSERT` ohne Tx.
- **Code:** `server/repositories/userSettingsRepository.ts:145`, `server/services/userSettingsService.ts:214`
- **Kommentar:** Gleichzeitige Erstanlage kann Duplicate-Key/500 statt sauberem Konflikt erzeugen.

### R7
- **Art:** `RACE_CONDITION`
- **Stufe:** Mittel
- **Beschreibung:** `project_status`-Fachprüfungen (`isDefault`, `inUse`) laufen vor Delete außerhalb Tx.
- **Code:** `server/services/projectStatusService.ts:76`
- **Kommentar:** Zwischen Prüfung und Write kann Zustand kippen.

### R8
- **Art:** `UNSAFE_BATCH`
- **Stufe:** Hoch
- **Beschreibung:** Demo-Seed-Create führt sehr viele Writes ohne globale DB-Transaktion aus.
- **Code:** `server/services/demoSeedService.ts` (u. a. Create-Flow ab `createSeedRun`)
- **Kommentar:** Fehlerpfad nutzt best-effort Cleanup, aber keine harte Atomizität.

### R9
- **Art:** `INCONSISTENT_ERROR`
- **Stufe:** Mittel
- **Beschreibung:** Nicht überall maschinenlesbare `{ code }`-Antworten für Mutationen (z. B. User-Settings bei Nicht-Version-Fehlern).
- **Code:** `server/controllers/userSettingsController.ts:31`
- **Kommentar:** 409 ist kodiert, andere Fehler teils nur `message`.

### R10
- **Art:** `LOST_UPDATE`
- **Stufe:** Mittel
- **Beschreibung:** Schema-Definitionen enthalten keine `version`-Spalten (Drizzle-Modelldrift zur DB-Migration).
- **Code:** `shared/schema.ts`
- **Kommentar:** Runtime-SQL nutzt Version teilweise per Raw SQL, aber Typsystem/Schema spiegeln den Locking-Stand nicht konsistent.

## 3) Gesamtbewertung

### Sind alle versionierten Tabellen korrekt geschützt?
- **Nein, nicht vollständig.**
- Für die meisten produktiven PATCH/PUT/DELETE-Endpunkte ist Versionierung implementiert.
- Es bestehen jedoch umgehbare Legacy-Pfade und unversionierte technische Mutationen.

### Gibt es Lücken?
- **Ja.**
- Kritisch: optionale Legacy-Fallbacks ohne Version, `storage`-Bypass, User-Settings-Upsert-Race, untransaktionale Note+Join-Erzeugung.

### Ist das System vollständig multi-user-stabil?
- **Nein.**
- Der Kern der Endnutzer-Mutationen ist deutlich verbessert, aber systemweit bestehen weiterhin Konflikt-/Parallelitätsrisiken.

### Kritische Bereiche
- `user_settings_value` Upsert-Race
- Note/Join-Mutationen ohne vollständige Atomik
- Interne Legacy-Pfade ohne zwingende Version
- Demo-Seed-Create als nicht-atomarer Batch-Write

### Restrisiko-Fazit
- **Mittel bis Hoch** (systemweit betrachtet).
- **Für zentrale Non-Admin-Endpunkte:** überwiegend gut abgesichert.
- **Für vollständige NFR-01-Konfliktstabilität:** derzeit noch nicht erreicht.

## Klare Antwort auf die Leitfrage

> Ist das System im aktuellen Zustand vollständig Multi-User-sicher?

**Nein.**

> Wenn nein: Wo genau nicht?

- In versionierungsumgehbaren Legacy-Pfaden (`server/services/*` mit optionaler Version + `server/storage.ts`).
- In untransaktionalen/teilweise unversionierten Join- und Upsert-Pfaden (`customer/project notes create`, `project status add relation`, `user settings upsert`).
- In technischen Batch-Flows ohne globale Atomik (`demo seed create`).
