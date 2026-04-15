# Auftragslog: Journal mit Detail-Tabs und explizitem Kontextmodell

## Meta

- Datum: 2026-04-15
- Branch: `feature/journal-tabs`
- Auftragsklasse: 5
- Ziel: Globales Journal und kontextbezogene Journal-Ansichten in den Detailformularen umsetzen, inklusive physischer Migration auf Dev und Test, hoher Testabdeckung und ausführlichem Abschlusslog.

## Gelesene Grundlagen

Gezielt gelesen wurden:

- `architecture-index.md`
- `implementation-index.md`
- die für Contract-First, Schichten, Listen-/Form-UI und Tests relevanten Zielabschnitte aus `docs/architecture.md` und `docs/implementation.md`
- die vom Auftrag referenzierten Brief-Dateien außerhalb des Repos als fachliche Ausgangsbasis

Nicht vollständig gelesen wurden die großen Gesamtdokumente, weil der Auftrag über die Indizes und die konkreten Einstiegspunkte im aktiven Code eindeutig genug eingegrenzt werden konnte.

## Umsetzungsziel und fachliche Festlegungen

Umgesetzt wurde ein Journal-System mit zwei zentralen Oberflächen:

1. einer globalen Journal-Ansicht in der Hauptnavigation
2. kontextbezogenen Journal-Ansichten als eigener Haupttab `Details | Journal` in den Detailformularen

Dabei wurden folgende fachlich-technische Entscheidungen festgezogen:

- Journal-Persistenz append-only
- explizites Kontextmodell über eine zweite Tabelle statt nur JSON-Auswertung
- Journal-Leserecht nur für `ADMIN` und `DISPONENT`
- Detailformulare bekommen einen äußeren Haupttab `Details | Journal`
- der Journal-Tab ist nur bei bestehenden Datensätzen sichtbar
- vorhandene innere Tabs bleiben innerhalb von `Details` erhalten

## Wichtige Abweichungen gegenüber den Brief-Snippets

Die Brief-Snippets wurden nicht 1:1 übernommen. Stattdessen wurden bewusst folgende Abweichungen umgesetzt:

- Kontextfilterung über `journal_entry_context` statt über freie JSON-Auswertung
- Integration des globalen Journals in `Home` und `Sidebar` statt als separater Top-Level-Sonderpfad
- ein vollständiger Lesetab `Journal` in den Detailformularen statt eines kleinen Sidebar-Panels
- best-effort Journal-Schreiben: Fachmutation darf bei Journalfehlern nicht scheitern

## Datenmodell

### Neue Tabellen

#### `journal_entry`

Zweck:

- zentrale append-only Journal-Haupttabelle

Wesentliche Felder:

- `table_name`
- `record_id`
- `record_key`
- `op`
- `field_name`
- `old_value`
- `new_value`
- `snapshot`
- `actor_user_id`
- `actor_name`
- `trigger_key`
- `message_text`
- `is_raw`
- `created_at`

Indizes:

- `idx_journal_entry_created_id`
- `idx_journal_entry_table_record_created`
- `idx_journal_entry_table_record_key_created`
- `idx_journal_entry_actor_created`
- `idx_journal_entry_trigger_created`

#### `journal_entry_context`

Zweck:

- robuste, indexierbare Kontextzuordnung eines Journal-Eintrags zu einem oder mehreren fachlichen Objekten

Wesentliche Felder:

- `entry_id`
- `context_table`
- `context_id`
- `context_key`
- `relation_role`

Indizes:

- `idx_journal_context_entry`
- `idx_journal_context_lookup`
- `idx_journal_context_key_lookup`

## Migrationen

### Neue Migration

Neu angelegt:

- `migrations/0025_journal_entries.sql`
- `migrations/meta/0025_snapshot.json`
- Update von `migrations/meta/_journal.json`

### Physische Migrationsläufe

Seriell ausgeführt:

1. `npm run db:migrate:dev`
2. `npm run db:migration-status:dev`
3. `npm run db:migrate:test`
4. `npm run db:migration-status:test`

### Ergebnis Dev

- `db:migrate:dev`: erfolgreich
- `db:migration-status:dev`: synchron

### Ergebnis Test

Erster Lauf:

- `db:migrate:test`: fehlgeschlagen

Konkreter Blocker:

- bestehende Migration `0023_drop_seed_run_tables.sql` führte auf einer frischen Testdatenbank `DROP TABLE` auf nicht vorhandene Tabellen aus
- Fehler: `Unknown table 'mugplan_test.seed_run_entity'`

Bewusste Korrektur:

- alte versionierte Migrationen wurden **nicht** umgeschrieben
- stattdessen wurde `script/run-migrations.ts` minimal erweitert, damit `DROP TABLE` idempotent behandelt wird, wenn die Tabelle nicht existiert

Danach:

- `db:migrate:test`: erfolgreich
- `db:migration-status:test`: synchron

Damit ist die neue Migrationskette physisch auf Dev und Test gelaufen.

## Backend-Umsetzung

### Request-/Akteur-Kontext

Erweitert wurden:

- `server/middleware/sessionAuth.ts`
- `server/middleware/resolveUserRole.ts`
- `server/repositories/usersRepository.ts`
- `server/lib/requestActor.ts`

Ziel:

- den Anzeigenamen des Akteurs einmal zentral auflösen
- ihn anschließend in allen Journal-Write-Pfaden sauber weiterreichen

### Journal-Service-Schicht

Neu angelegt:

- `server/repositories/journalRepository.ts`
- `server/services/journalService.ts`
- `server/controllers/journalController.ts`
- `server/routes/journalRoutes.ts`
- `server/lib/journalMessages.ts`

Wesentliche Eigenschaften:

- best-effort Schreiben
- Self-Kontext wird automatisch ergänzt
- doppelte Kontexte werden dedupliziert
- unbekannte Nachrichtenfälle fallen kontrolliert auf Raw-Text zurück
- Journal-Lesen hat eine zentrale Rollenprüfung

### Contract und Routing

Erweitert wurden:

- `shared/schema.ts`
- `shared/routes.ts`
- `server/routes.ts`

Neuer Read-Endpoint:

- `GET /api/journal/messages`

Unterstützte Filter:

- `page`
- `pageSize`
- `from`
- `to`
- `actor`
- `q`
- `triggerKey`
- `contextTable`
- `contextId`
- `contextKey`

### Instrumentierte Mutationspfade

Journalisiert wurden zusätzlich bzw. vollständig:

- Termine
- Termin-Tags
- Termin-Mitarbeiter-Deltas
- Termin-Anhänge
- Termin-Notizen
- Projekte
- Auftragspositionen
- Projekt-Tags
- Projekt-Anhänge
- Projekt-Notizen
- Kunden
- Kunden-Tags
- Kunden-Anhänge
- Kunden-Notizen
- Mitarbeiter
- Mitarbeiter-Aktivstatus
- Mitarbeiter-Tags
- Mitarbeiter-Anhänge
- Mitarbeiter-Notizen
- Wochenplan-Zuordnungen
- Kalenderwochen blockieren/freigeben
- Kalenderwochen-Notizen
- relevante Masterdata-Mutationen

Wesentliche betroffene Dateien:

- `server/controllers/appointmentsController.ts`
- `server/controllers/appointmentAttachmentsController.ts`
- `server/controllers/appointmentNotesController.ts`
- `server/controllers/projectsController.ts`
- `server/controllers/projectAttachmentsController.ts`
- `server/controllers/projectNotesController.ts`
- `server/controllers/customersController.ts`
- `server/controllers/customerAttachmentsController.ts`
- `server/controllers/customerNotesController.ts`
- `server/controllers/employeesController.ts`
- `server/controllers/employeeAttachmentsController.ts`
- `server/controllers/employeeNotesController.ts`
- `server/controllers/notesController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/controllers/tourWeeksController.ts`
- `server/controllers/calendarWeekNotesController.ts`
- `server/controllers/masterDataController.ts`

## Frontend-Umsetzung

### Neues Globaljournal

Neu angelegt:

- `client/src/components/JournalRecordsView.tsx`
- `client/src/components/JournalPage.tsx`

Integriert über:

- `client/src/components/Sidebar.tsx`
- `client/src/lib/domain-icons.tsx`
- `client/src/pages/Home.tsx`

Eigenschaften:

- serverseitig paginierte Tabelle
- Filter für Datum, Akteur und Freitext
- gedimmte/monospace Darstellung für Raw-Einträge

### Detailformulare mit Haupttabs

Erweitert wurden:

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/ProjectForm.tsx`

Umsetzung:

- äußerer Haupttab `Details | Journal`
- `Details` enthält die bestehende Formularstruktur
- `Journal` zeigt eine kontextgebundene Journal-Liste
- im Create-Modus bleibt der Journal-Tab verborgen

Innere Tabs bleiben erhalten:

- Projekt: `Anmerkungen`, `Artikelliste`
- Mitarbeiter: `Stammdaten`, `Termine`, `Wochenplanung`

## Nebenkorrekturen

Neben der Hauptumsetzung wurden zwei kleine technische Korrekturen mitgeführt:

- `client/src/components/TourManagement.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`

Zweck:

- Entfernen ungenutzter Variablen, damit `typecheck` wieder sauber läuft

## Testabdeckung

### Neue Tests

Neu angelegt:

- `tests/unit/services/journalService.test.ts`
- `tests/integration/server/journal.routes.integration.test.ts`

### Erweiterte bestehende Tests

Aktualisiert wurden:

- `tests/unit/ui/customerData.layoutShellIntegration.test.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/unit/ui/home.behavior.test.tsx`
- `docs/TEST_MATRIX.md`

### Durchgeführte Verifikation

Seriell ausgeführt:

1. `npm run typecheck`
2. `npx vitest run --config vitest.workspace.ts --project unit tests/unit/services/journalService.test.ts tests/unit/ui/customerData.layoutShellIntegration.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/home.behavior.test.tsx`
3. `npx vitest run --config vitest.workspace.ts --project integration tests/integration/server/journal.routes.integration.test.ts --reporter=verbose`
4. `npm run lint`

### Ergebnisse

- `typecheck`: grün
- gezielte Unit-Tests: grün
- gezielter Integrationstest: grün
- `lint`: grün

### Nicht ausgeführt

Nicht ausgeführt wurden in diesem Auftrag:

- voller Audit gemäß Repo-Definition
- voller Testlauf inklusive kompletter Unit-/Integration-/E2E-/Browser-E2E-Suite

Grund:

- fokussierte Verifikation auf den konkret geänderten Journal-Slice und die neue Migrationskette

## Bekannte Grenzen / Restpunkte

- Es wurde kein voller Browser-E2E-Lauf für den Journal-Tab durchgeführt.
- Die UI-Absicherung deckt die sichtbare Tab-Integration und Navigation ab, nicht den kompletten Browser-Flow zwischen `Details` und `Journal`.
- Der initiale Test-Migrationsblocker lag in einer älteren Migration und wurde bewusst im Runner statt durch Umschreiben historischer Migrationen abgefangen.

## Geänderte Dateien nach Bereichen

### Datenmodell / Contracts / Migration

- `shared/schema.ts`
- `shared/routes.ts`
- `migrations/0025_journal_entries.sql`
- `migrations/meta/0025_snapshot.json`
- `migrations/meta/_journal.json`
- `script/run-migrations.ts`

### Backend Journal-Kern

- `server/repositories/journalRepository.ts`
- `server/services/journalService.ts`
- `server/controllers/journalController.ts`
- `server/routes/journalRoutes.ts`
- `server/lib/journalMessages.ts`
- `server/lib/requestActor.ts`
- `server/routes.ts`

### Backend Anbindung an bestehende Fachpfade

- `server/controllers/appointmentsController.ts`
- `server/controllers/appointmentAttachmentsController.ts`
- `server/controllers/appointmentNotesController.ts`
- `server/controllers/projectsController.ts`
- `server/controllers/projectAttachmentsController.ts`
- `server/controllers/projectNotesController.ts`
- `server/controllers/customersController.ts`
- `server/controllers/customerAttachmentsController.ts`
- `server/controllers/customerNotesController.ts`
- `server/controllers/employeesController.ts`
- `server/controllers/employeeAttachmentsController.ts`
- `server/controllers/employeeNotesController.ts`
- `server/controllers/notesController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/controllers/tourWeeksController.ts`
- `server/controllers/calendarWeekNotesController.ts`
- `server/controllers/masterDataController.ts`
- `server/services/masterDataService.ts`
- `server/services/notesService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/services/tourWeeksService.ts`
- `server/middleware/sessionAuth.ts`
- `server/middleware/resolveUserRole.ts`
- `server/repositories/usersRepository.ts`

### Frontend

- `client/src/components/JournalRecordsView.tsx`
- `client/src/components/JournalPage.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/lib/domain-icons.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/TourManagement.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`

### Tests / Doku

- `tests/unit/services/journalService.test.ts`
- `tests/integration/server/journal.routes.integration.test.ts`
- `tests/unit/ui/customerData.layoutShellIntegration.test.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/unit/ui/home.behavior.test.tsx`
- `docs/TEST_MATRIX.md`

## Abschlussbewertung

Der Auftrag ist auf dem implementierten Scope fachlich und technisch umgesetzt:

- Journal-Datenmodell vorhanden
- Dev- und Testmigration physisch erfolgreich
- globales Journal vorhanden
- `Details | Journal` in den vier Ziel-Formularen vorhanden
- zentrale Read-API vorhanden
- zentrale Testabdeckung für Service, Route, Navigation und Formular-Tabs ergänzt

Der Stand ist damit bereit für Commit und Push auf dem Arbeitsbranch.
