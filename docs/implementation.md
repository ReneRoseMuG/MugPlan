# MuGPlan – Engineering & Implementation Handbook (Ist-Stand)

Dokumentstand: v2.2  
Datum: 2026-04-14  
Commit: —

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

Zusätzliche ENV-Variable `TRUST_PROXY`: steuert Express `trust proxy`-Setting. Akzeptiert `true`, `false` oder eine Ganzzahl. Default: `1` in production, `false` sonst.

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
- Historische Termin-Blockade mit Admin-Ausnahme
- Überlappungsprüfung von Mitarbeiterzuweisungen
- Fehlercodes: `EMPLOYEE_OVERLAP_CONFLICT`, `VERSION_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `INACTIVE_ENTITY_ASSIGNMENT`, `VALIDATION_ERROR`

KW-Planungs-Fehlercodes (`tourWeeksService`, `tourWeekEmployeesService`): `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `NOT_FOUND`, `VALIDATION_ERROR`. Vergangene Tour-KWs bleiben serverseitig für alle Rollen schreibgeschützt. Die laufende Tour-KW ist für `ADMIN` und `DISPONENT` editierbar.

Overlap wird transaktional geprüft und blockierend erzwungen.

### 5.2 Kalender-Aggregation

Kalender-Endpoints liefern aggregierte Terminobjekte mit:

- Projektdaten inkl. Status
- Kundendaten
- Tourdaten
- Mitarbeiterliste
- Notizzähler
- optionaler Termin-Notizvorschau über `includeAppointmentNotes=true`
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
USER-scoped Settings werden benutzerspezifisch persistiert (Beispiele: Lane-Kollaps, Kachel-Körper-Modus, Abwesenheits-Lane-Sichtbarkeit, Kopfzeilen-Textfarbe pro Tour `calendar.tourHeaderTextColors`).

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

### 5.7 System Seed

`server/services/systemSeedService.ts` stellt `applySystemSeed()` bereit — eine idempotente Funktion zur Sicherstellung von Stammdaten-Defaults: System-Tags, System-Touren, Notizvorlagen. Migrationen (z. B. „Vakant“ → „Geparkt“, Tour „Vakant“ → „Parkplatz“) werden ebenfalls idempotent ausgeführt. Kein Run-Tracking; `seed_run`/`seed_run_entity` wurden per Migration 0023 entfernt. Demo-Seed und Admin-Reset-Pfad existieren nicht mehr.

### 5.8 Admin Bulk Import

Admin-Importpfade laufen über `server/routes/adminBulkImportRoutes.ts` und die zugehörigen Controller/Services:

- Customer Bulk Import: Analyse, Neuanlage und Update von Dubletten
- Project Bulk Import: Analyse, Neuanlage und Special-Case-Pfad mit zusätzlicher Customer-Auflösung

### 5.9 Projektaufträge, Positionen und Tags

Das Projektdatenmodell umfasst zusätzlich:

- `project_order` als 1:1-Erweiterung des Projekts für Auftragsnummer, Betrag und Planungsfelder
- `project_order_items` für positionsbezogene Produkt-/Komponenten-/Freitextzeilen mit Konsistenz-Checks
- universelles Tagging für Projekte, Kunden, Mitarbeiter und Termine; Termin-Tags werden über `appointment_tags` persistiert

### 5.10 Monitoring

`server/services/monitoringService.ts` wertet aktive Trigger aus und liefert eine aggregierte Übersicht für Disponenten und Admins. Aktive Trigger: `TR-01` (Mindestzahl Mitarbeiter), `TR-02` (Geparkt). Trigger-Definitionen, Namen und Farben sind zentral in `shared/monitoring.ts` gepflegt. Der Schwellwert für TR-01 wird über das globale Setting `monitoring.tr01.minimumEmployees` konfiguriert. Disponenten erhalten Lesezugriff auf `/api/monitoring`; die Admin-Konfiguration unter `/api/admin/monitoring/config` ist nur für Admins zugänglich.

### 5.11 Kundenadressen und wirksame Lieferadresse (MS-68/FT09)

`server/repositories/effectiveDeliveryAddress.ts` löst die wirksame Lieferadresse je Kunde auf (Lieferadresse, sonst Rechnungsadresse) und stellt einen Spaltenselektor bereit, mit dem alle bestehenden Projektionen (Termine/Kalender, Sidebar, Tour-Druck, Reports, Projekt-Board, Export, Kundenliste) die wirksame Lieferadresse unter unveränderten DTO-Feldnamen ausgeben. Das Kundenformular bearbeitet weiter die flachen Adressfelder als Rechnungsadresse; `customersRepository.createCustomer`/`updateCustomerWithVersion` spiegeln diese transaktional in eine `customer_address`-Rechnungsadress-Zeile (Write-Through). Die Pflichtkategorien Rechnungs-/Lieferadresse werden im Bootstrap (`ensureMasterDataDefaults`) idempotent sichergestellt. CRUD über `customerAddressesService`/`customerAddressesController` mit Contracts unter `api.customerAddresses` und `api.addressCategories`; Frontend-Adressmutationen lösen `invalidateTagProjectionQueries()` aus, sodass die Konsumenten unmittelbar den neuen Stand zeigen. Der Adresskategorie-Katalog wird im Stammdatenbereich gepflegt (`AddressCategoryManagementPage`, Tab „Adresskategorien"); die geschützten Pflichtkategorien sind dort read-only.

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
- Historische Terminmutationen sind im aktuellen Service-Code für `DISPONENT` gesperrt; `ADMIN` darf historische Termin-Mutationen ausführen. API- und UI-Verhalten müssen daran ausgerichtet bleiben.

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
- erhält aktive Kalendermarker über `/api/calendar/markers`
- kann Kalendermarker und automatische Feiertags-Overrides über `/api/admin/calendar-markers` lesen, anlegen, bearbeiten und löschen
- kann die globale Kalendermarker-Darstellung `calendar.markerVisualizationStyle` setzen
- erhält Zugriff auf `/api/monitoring`, aber nicht auf die Admin-Konfiguration unter `/api/admin/monitoring/config`
- sieht deaktivierte Einträge nur, wenn sie historisch referenziert sind
- erhält bei Produktkategorien, Produkten, Komponentenkategorien und Komponenten in den Masterdata-Leseendpunkten ausschließlich aktive Einträge; `active=all` oder `active=inactive` wird serverseitig auf aktive Auswahlstammdaten begrenzt
- erhält bei terminbezogenen Mitarbeiterlisten derzeit dieselbe aktive Mitarbeiterliste wie in der allgemeinen Mitarbeiteransicht; serverseitig aktiv durchgesetzt bleiben in diesem Pfad vor allem Overlap- und Historical-Lock-Regeln
- darf historische Termine nicht mutieren; die historische Sperre wird serverseitig durchgesetzt
- darf die laufende Tour-KW bearbeiten und blockieren oder freigeben
- darf vergangene Tour-KWs nicht mutieren; die Tour-KW-Sperre wird serverseitig durchgesetzt
- erhält keine aktive FT30-Abwesenheitsdomäne; frühere FT30-Reste sind im aktuellen Routing nicht registriert

### Admin

- erhält aktive und inaktive Einträge
- erhält bei Produktkategorien, Produkten, Komponentenkategorien und Komponenten in den Masterdata-Leseendpunkten aktive und inaktive Einträge, wenn der Filter dies anfordert
- kann Aktiv-Status ändern
- kann archivierte Einträge einsehen
- erhält aktive Kalendermarker über `/api/calendar/markers`
- kann Kalendermarker und automatische Feiertags-Overrides über `/api/admin/calendar-markers` lesen, anlegen, bearbeiten und löschen
- kann die globale Kalendermarker-Darstellung `calendar.markerVisualizationStyle` setzen
- darf historische Termine mutieren; die übrigen Terminregeln wie Relationspflicht, Versionsschutz, Overlap-Prüfung, Storno-Sperre und blockierte Tourwochen bleiben serverseitig aktiv
- darf die laufende Tour-KW bearbeiten und blockieren oder freigeben; vergangene Tour-KWs bleiben schreibgeschützt
- erhält Lese- und Schreibzugriff auf die FT31-Monitoring-Konfiguration sowie Lesezugriff auf `/api/monitoring`
- erhält den Projektstatus-Katalog nur noch im Admin-Stammdatenbereich
- erhält ebenfalls keine aktiv verdrahtete FT30-Abwesenheitsdomäne; vorhandene Restartefakte in Contracts, Schema oder UI sind derzeit nicht Teil des aktiven Routing

### Leser

- erhält ausschließlich lesenden Zugriff
- keine schreibenden Endpunkte verfügbar, mit Ausnahme benutzereigener Report-Presets
- erhält bei Produktkategorien, Produkten, Komponentenkategorien und Komponenten in den Masterdata-Leseendpunkten ausschließlich aktive Einträge; `active=all` oder `active=inactive` wird serverseitig auf aktive Auswahlstammdaten begrenzt
- erhält aktive Kalendermarker über `/api/calendar/markers`
- erhält keinen Zugriff auf die Admin-Pflege unter `/api/admin/calendar-markers`
- kein Zugriff auf FT31-Monitoring-Endpunkte oder Monitoring-Konfiguration

### Report-Presets

- `/api/report-configs/:reportKey` liefert für `ADMIN`, `DISPONENT` und `LESER` ausschließlich Presets im Scope `USER` des angemeldeten Benutzers.
- `/api/report-configs/:reportKey/presets/:presetId` speichert und löscht für `ADMIN`, `DISPONENT` und `LESER` ausschließlich benutzereigene `USER`-Presets.
- `GLOBAL`-Presets werden im Report-Preset-Contract nicht mehr akzeptiert und nicht mehr aus der Preset-Persistenz gelesen.
- Preset-Aktionen wie Report öffnen oder Druckvorschau öffnen werden serverseitig nicht mehr persistiert; ein Preset speichert nur Konfigurationswerte.
- Die globale Produktionsplanung-Kategorie-Layout-Einstellung `reports.categoryLayout` bleibt davon unberührt und weiterhin `ADMIN`-verwaltet.

### Listenfilter (serverseitig)

- `/api/projects` und `/api/projects/list` unterstützen serverseitig neben Text-, Scope- und Tagfiltern auch `articleProductIds` und `articleComponentIds`. Produkt-IDs bilden die Artikellisten-Kategorie `Sauna`; Komponenten werden über ihre Stammdatenkategorie den festen Artikellistenfeldern zugeordnet. Innerhalb einer Artikellisten-Kategorie gilt ODER, zwischen unterschiedlichen Kategorien gilt UND.
- `/api/appointments/list` unterstützt serverseitig die Filter `employeeId`, `projectId`, `customerId`, `tourId`, `projectTitle`, `customerLastName`, `customerNumber`, `orderNumber`, `tagIds`, `dateFrom` und `dateTo`
- Textfilter in der Terminliste werden serverseitig über Projekt- und Kundenfelder ausgewertet; UI-Filter dienen nur als Eingabeoberfläche

### Kundenadressen und Adresskategorien (MS-68/FT09)

- `/api/customers/:customerId/addresses` (Liste): für alle Rollen lesbar, die den Kunden sehen; bei nicht-Admins gilt die Aktiv-Sichtbarkeit des Kunden. Anlegen, Ändern und Entfernen sind nur für `DISPONENT` und `ADMIN` zulässig; `LESER` bleibt read-only. Die systemgepflegte Rechnungsadress-Zeile ist über das Adress-CRUD geschützt (nicht löschbar, nicht direkt änderbar) und wird ausschließlich über das Kundenformular gepflegt.
- `/api/address-categories`: Lesen ist für berechtigte Rollen möglich; Anlegen, Ändern und Löschen sind `ADMIN`-only. Die geschützten Pflichtkategorien Rechnungs- und Lieferadresse können weder umbenannt/deaktiviert noch gelöscht werden; eine in Verwendung befindliche Kategorie ist nicht löschbar.

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
