# MuGPlan – Engineering & Implementation Handbook (Ist-Stand)

Dokumentstand: v2.1  
Datum: 2026-03-05  
Commit: 37cb373

## Zweck dieses Dokuments

Dieses Dokument beschreibt die konkrete technische Umsetzung des aktuellen Ist-Stands: Betriebsmodell, Contracts, Schichtregeln, Sicherheits-Gates, Testarchitektur und Implementierungsmuster.

## 1. Projektbetrieb

### 1.1 Startbefehle

`package.json` definiert:

- `npm run dev` -> `cross-env NODE_ENV=development tsx server/index.ts`
- `npm test` -> `cross-env NODE_ENV=test MUGPLAN_MODE=test vitest`
- `npm start` -> `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`

### 1.2 Build/Checks

- `npm run build` -> `tsx script/build.ts`
- `npm run typecheck` -> `tsc --noEmit`
- `npm run check` -> Encoding-Check + Destructive-Inventory-Check + TypeScript

### 1.3 Dev/Prod-Auslieferung

- Development: Vite wird serverseitig integriert (`server/vite.ts`)
- Production: statische Assets via `server/static.ts`

## 2. Runtime- und Env-Regeln

### 2.1 Zentrale Runtime-Auflösung

`server/config/runtimeEnv.ts` erzwingt:

- Dev: `../../shared/.env.dev` muss existieren
- Test: `../../shared/.env.test` muss existieren
- Prod: Werte aus Prozessumgebung

Pflichtvariablen:

- `MYSQL_DATABASE_URL`
- `DB_ALLOWED_DATABASES_<MODE>`
- `DB_ALLOWED_HOSTS_<MODE>`

CSV-Werte werden getrimmt und normalisiert, Hosts in lowercase.

### 2.2 DB-Startup-Gate

`server/db.ts` validiert das Ziel vor `createPool()`:

- non-test: `assertSafeDatabaseTargetForMode`
- test: `assertTestMode` + `assertSafeWriteTargetForTestMode`

## 3. Contract-First und Schichten

### 3.1 Contracts

`shared/routes.ts` ist der zentrale Contract-Index (Methoden, Pfade, Zod-Schemas, Response-Codes).

Neue Endpunkte werden dort angelegt, danach in den Route-Modulen registriert.

### 3.2 Schichtkette

Verbindlicher Codepfad:

1. Route (`server/routes/*`)
2. Controller (`server/controllers/*`)
3. Service (`server/services/*`)
4. Repository (`server/repositories/*`)

JSON-Validation erfolgt schema-basiert über Contract-Schemas; Multipart über den zentralen Parser (`server/lib/multipart.ts`).

## 4. Auth, Session, Rollen

### 4.1 Session-Modell

`server/middleware/sessionAuth.ts`:

- `express-session`
- Cookie `httpOnly`, `sameSite=lax`
- `SESSION_COOKIE_SECURE`: `auto|true|false`
- Session speichert entweder `userId` oder einen temporären `preAuth`-Status für den 2FA-Flow
- Public-Pfade für Setup, Login, 2FA-Verify, Quick-Login, Logout und `/health` ohne `requireSessionUser`

### 4.2 Rollenauflösung

`server/middleware/resolveUserRole.ts` lädt User+Role aus DB und setzt `req.userContext`.

### 4.3 Middleware-Reihenfolge

`server/routes.ts`:

- `sessionAuth` -> `setupGate` -> `authRoutes`
- `requireSessionUser` -> `resolveUserRole` -> `enforceAdminMaintenancePolicy`
- danach Domänen-Routen

## 5. Domänen-Implementierung (Server)

### 5.1 Termine und Overlap

`server/services/appointmentsService.ts` implementiert:

- Validierung Datum/Zeiten
- Historische Termin-Blockade
- Überlappungsprüfung von Mitarbeiterzuweisungen
- Fehlercodes: `EMPLOYEE_OVERLAP_CONFLICT`, `VERSION_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `INACTIVE_ENTITY_ASSIGNMENT`, `VALIDATION_ERROR`

Overlap wird transaktional geprüft und blockierend erzwungen.

### 5.2 Kalender-Aggregation

Kalender-Endpoints liefern aggregierte Terminobjekte mit:

- Projektdaten inkl. Status
- Kundendaten
- Tourdaten
- Mitarbeiterliste
- Notizzähler
- Anzeige-Felder wie `displayMode`, `allDay`, `singleEmployee`
- `isLocked`

### 5.3 Attachments

Technik:

- Upload-Limit 10 MB (`MAX_UPLOAD_BYTES`)
- Dateiablage über `writeAttachmentBuffer`
- MIME-/Filename-Normalisierung zentral
- Download zentral über `sendAttachmentDownload`

Domänen:

- Projekt, Kunde, Mitarbeiter jeweils mit eigenen Tabellen/Services
- Delete: Projekt und Mitarbeiter via `DELETE`-Endpoint auf `405` blockiert; Kunde ohne Delete-Contract

### 5.4 Dokumentextraktion

Aktive Verarbeitungskette (`server/services/documentProcessingService.ts`):

- `documentTextExtractor`
- `documentHeaderDeterministicParser`
- `documentArticleDeterministicParser`
- `extractionValidator`

Konfliktcode bei Auftragsnummer-Kollision: `ORDER_NUMBER_ALREADY_IMPORTED`.

### 5.5 User Settings

Serverauflösung in `server/services/userSettingsService.ts`:

- Scopes: `GLOBAL`, `ROLE`, `USER`
- Resolved-Reihenfolge: `USER -> ROLE -> GLOBAL -> DEFAULT`
- Setzen mit Versionsprüfung (`VERSION_CONFLICT`)

Registry in `server/settings/registry.ts` enthält valide Keys, Typen, Allowed Scopes und Validatoren.
Aktive globale Settings steuern u. a. Backup-Aktivierung, 2FA-Pflicht sowie Kalender- und UI-Defaults.

### 5.6 Backup und CalDAV

Backup:

- Scheduler (`node-cron`) täglich 02:00
- Runtime-Lock via DB `GET_LOCK`
- Skip-Gründe (`disabled`, `no_changes`, etc.) werden geloggt
- manuelle Auslösung via Admin-Endpoint

CalDAV:

- asynchrone Dispatch-Queue (`caldavSyncDispatcher`)
- Upsert/Delete via `caldavService`
- Sync-Status in `calendar_sync_log`

### 5.7 Demo Seed/Purge

`server/services/demoSeedService.ts`:

- Run-Typen: `base`, `appointments`, `legacy`
- Persistenztracking via `seed_run`, `seed_run_entity`
- Purge mit DB-/Dateilöschung und Idempotenz
- zusätzliche Safety-Prüfung via `assertSafeDemoSeedPurgeTarget`
- Basis-Seed nutzt vorhandene aktive Mitarbeitende aus der Datenbank
- Mitarbeitende werden fuer den Basis-Run nicht als purge-bare Seed-Entitaeten angelegt; die Termine-Sequenz nutzt dafuer die im Run-Summary referenzierten Mitarbeiter-IDs

`server/services/adminService.ts` / `server/repositories/adminRepository.ts`:

- zentraler Admin-Reset löscht Demo-/Fachdaten, aber keine `users`, `roles`, `employee` oder `employee_attachment`

### 5.8 Admin Bulk Import

Admin-Importpfade laufen über `server/routes/adminBulkImportRoutes.ts` und die zugehörigen Controller/Services:

- Customer Bulk Import: Analyse, Neuanlage und Update von Dubletten
- Project Bulk Import: Analyse, Neuanlage und Special-Case-Pfad mit zusätzlicher Customer-Auflösung

### 5.9 Projektaufträge, Positionen und Tags

Das Projektdatenmodell umfasst zusätzlich:

- `project_order` als 1:1-Erweiterung des Projekts für Auftragsnummer, Betrag und Planungsfelder
- `project_order_items` für positionsbezogene Produkt-/Komponenten-/Freitextzeilen mit Konsistenz-Checks
- universelles Tagging für Projekte, Kunden, Mitarbeiter und Termine; Termin-Tags werden über `appointment_tags` persistiert

## 6. Frontend-Implementierung

### 6.1 Hauptorchestrierung

`client/src/pages/Home.tsx` steuert alle Hauptansichten, Kontextkalender und Rücksprungkontexte.

### 6.2 Query-Client

`client/src/lib/queryClient.ts`:

- `credentials: include`
- `staleTime: Infinity`
- kein automatisches Retry

### 6.3 Filter-Pattern

`client/src/hooks/useListFilters.ts`:

- typisierter Filterstate
- `setFilter()` setzt immer Seite auf `1`
- `resetFilters()` setzt Filter + Seite zurück

Aktive Nutzung u. a. in `CustomersPage`, `EmployeesPage`, `ProjectsPage`, `Home`.

### 6.4 Listen-Architektur

Standardkomponenten:

- `ListLayout`
- `BoardView`
- `TableView`

ViewMode wird über Settings-Keys persistiert (`customers.viewMode`, `employees.viewMode`, `projects.viewMode`, `helptexts.viewMode`, `appointments.viewMode`).
Admin-Listen für Kunden und Projekte binden zusätzlich Bulk-Import-Dialoge ein.

### 6.5 Settings im Frontend

`SettingsProvider` lädt `/api/user-settings/resolved`, setzt via PATCH und macht Version-Retry bei Konflikten.
`SettingsPage` nutzt die aufgelösten Settings für Backup-Monitoring und manuellen Backup-Run sowie die globale 2FA-Aktivierung.

## 7. Sicherheitsgates für destruktive Operationen

### 7.1 Zentrale Guards

`server/security/dbSafetyGuards.ts` stellt bereit:

- `assertTestMode`
- `assertSafeWriteTargetForTestMode`
- `assertSafeDestructiveOperationTarget`
- `assertSafeAdminDestructiveOperationTarget`
- `assertSqlDatabaseIdentity`

### 7.2 Test-Reset

`tests/helpers/resetDatabase.ts`:

- Guard-Prüfung vor Reset
- DB-Lock (`GET_LOCK`) für serialisierten Reset
- SQL-Identity-Prüfung mit `SELECT DATABASE()`

### 7.3 SQL-Reset-Skripte

- `script/sql/reset_safe_dev_test.sql` (Guard auf erlaubte Dev/Test DBs)
- `script/sql/reset_absolute_state.sql` (Guard auf `*_test`)

## 8. Testarchitektur (Ist)

### 8.1 Setup

`tests/setup.env.ts` setzt:

- `NODE_ENV=test`
- `MUGPLAN_MODE=test`
- `initializeRuntimeEnv()`

Integration/E2E-Dateien triggern reset via `resetDatabase()`.

### 8.2 Testebenen

- Unit: isolierte Logik/UI-Wiring/Services
- Integration: API + DB + Repository-Pfade
- E2E / E2E-Browser: Workflows über Systemgrenzen

Matrix wird zentral gepflegt in `docs/TEST_MATRIX.md`.

## 9. Skripte und operative Helfer

Wichtige Scripts unter `script/`:

- `build.ts`
- `check-frontend-encoding.ts`
- `check-destructive-inventory.ts`
- `check-migration-status.ts`
- `check-ollama.ts`
- `run-migrations.ts`
- `verify-demo-seed.ts`
- `test-template-render.ts`
- `reset-test-db.ts`
- SQL-Skripte unter `script/sql/`

Verbindlicher Migrationspfad fuer operative Nutzung:

- Dev-Status pruefen: `npm run db:migration-status:dev`
- Test-Status pruefen: `npm run db:migration-status:test`
- Prod-Status pruefen: `npm run db:migration-status:prod`
- Dev migrieren: `npm run db:migrate:dev`
- Test migrieren: `npm run db:migrate:test`
- Prod migrieren: `npm run db:migrate:prod`

Die Statuspruefung vergleicht Repository-Migrationen mit `__drizzle_migrations`.
Ein Migrationslauf gilt erst dann als abgeschlossen, wenn anschliessend der jeweilige Status-Check synchron meldet.

## 10. Implementierungsregeln für Änderungen

1. Contract zuerst (`shared/routes.ts`)
2. Schichten strikt einhalten
3. fachliche Regeln serverseitig absichern
4. React Query-Invalidierung statt lokaler Schattenzustände
5. kalenderweite Felder über Aggregations-Endpoints ergänzen
6. keine stillen Architektur-/Tooling-Änderungen

## 11. Bekannte technische Hinweise

- In mehreren Dateien sind Mojibake-Spuren sichtbar; Encoding-Konsistenz muss bei Änderungen aktiv beachtet werden.
- Historische Terminmutationen sind im aktuellen Service-Code unabhängig von Rolle gesperrt; API- und UI-Verhalten müssen daran ausgerichtet bleiben.

## 12. Abgrenzung zu `architecture.md`

Dieses Dokument enthält bewusst Implementierungsdetails (Dateien, Flows, Guards, Skripte). Grundsätzliche Systemstruktur, Domänenzuschnitt und Erweiterungspunkte stehen in `docs/architecture.md`.

---

## Sichtbarkeit von Daten (Rollenabhängige Filter)

Dieser Abschnitt beschreibt ausschließlich, welche Rollen welche Daten serverseitig erhalten.

Sichtbarkeitsregeln werden serverseitig durchgesetzt. UI-Filter ersetzen keine Backend-Prüfung.

### Disponent

- erhält nur `is_active = true` bei:
  - Mitarbeiter
  - Kunden
- erhält Zugriff auf `/api/monitoring`, aber nicht auf die Admin-Konfiguration unter `/api/admin/monitoring/config`
- sieht deaktivierte Einträge nur, wenn sie historisch referenziert sind
- erhält keine inaktiven Stammdateneinträge in Auswahlendpunkten
- erhält bei terminbezogenen Mitarbeiterlisten derzeit dieselbe aktive Mitarbeiterliste wie in der allgemeinen Mitarbeiteransicht; serverseitig aktiv durchgesetzt bleiben in diesem Pfad vor allem Overlap- und Historical-Lock-Regeln
- erhält keine aktive FT30-Abwesenheitsdomäne; frühere FT30-Reste sind im aktuellen Routing nicht registriert

### Admin

- erhält aktive und inaktive Einträge
- kann Aktiv-Status ändern
- kann archivierte Einträge einsehen
- erhält Lese- und Schreibzugriff auf die FT31-Monitoring-Konfiguration sowie Lesezugriff auf `/api/monitoring`
- erhält den Projektstatus-Katalog nur noch im Admin-Stammdatenbereich
- erhält ebenfalls keine aktiv verdrahtete FT30-Abwesenheitsdomäne; vorhandene Restartefakte in Contracts, Schema oder UI sind derzeit nicht Teil des aktiven Routing

### Leser

- erhält ausschließlich lesenden Zugriff
- keine schreibenden Endpunkte verfügbar
- kein Zugriff auf FT31-Monitoring-Endpunkte oder Monitoring-Konfiguration

### Listenfilter (serverseitig)

- `/api/appointments/list` unterstützt serverseitig die Filter `employeeId`, `tourId`, `projectTitle`, `customerLastName`, `customerNumber`, `orderNumber`, `tagIds`, `dateFrom` und `dateTo`
- Textfilter in der Terminliste werden serverseitig über Projekt- und Kundenfelder ausgewertet; UI-Filter dienen nur als Eingabeoberfläche

---

## Schutzregel

Dieser Abschnitt ist ein dauerhaft verbindlicher Bestandteil der Implementation-Dokumentation und muss stets am Ende der Datei stehen.

Er darf nicht entfernt, in andere Kapitel verschoben oder in seiner grundsätzlichen Struktur aufgelöst werden.

Er muss jedoch inhaltlich aktuell gehalten werden. Wenn sich serverseitige Sichtbarkeitsregeln, Rollenlogik oder Filtermechanismen ändern, sind diese Änderungen hier präzise und vollständig zu dokumentieren.

Zulässig sind:

- fachliche Ergänzungen bei neuen Entitäten
- Anpassungen bestehender Rollenregeln
- Präzisierungen bei geänderter Filterlogik

Nicht zulässig sind:

- strukturelle Auflösung des Abschnitts
- Integration in andere Kapitel
- Entfernung des Abschnitts

Der Abschnitt dient als autoritative Referenz für serverseitige Sichtbarkeitsregeln im Multi-User-System.
