# MuGPlan – Architektur (Ist-Stand)

Dokumentstand: v2.1  
Datum: 2026-03-05  
Commit: 37cb373

## Ziel dieses Dokuments

Dieses Dokument beschreibt die aktuelle Systemarchitektur von MuGPlan auf Basis der vorhandenen Codebase (`client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/` inkl. `logs/` und `attached_assets/` als eingelesener Kontext). Fokus ist die Struktur- und Verantwortungsarchitektur, nicht die Implementierungsdetails einzelner Funktionen.

## 1. Systemüberblick

MuGPlan ist eine Webanwendung mit:

- Frontend: React + TypeScript + TanStack Query (SPA)
- Backend: Express + TypeScript
- Persistenz: MySQL über Drizzle ORM + mysql2
- Geteilte API-Verträge: `shared/routes.ts` (Contract-First) und `shared/schema.ts` (Datenmodell)

Die API wird unter `/api` bereitgestellt. Der Server startet in `server/index.ts`.

## 2. Laufzeit- und Umgebungsarchitektur

### 2.1 Laufzeitmodi

Die Runtime wird zentral über `server/config/runtimeEnv.ts` aufgelöst:

- `development` lädt zwingend `../../shared/.env.dev`
- `test` lädt zwingend `../../shared/.env.test`
- `production` nutzt Prozessumgebung (Start via `npm start` mit `--env-file=../../shared/.env.prod`)

Es gibt keinen Env-Fallback für `development`/`test`.

### 2.2 Startup-Architektur

Der Startflow in `server/index.ts`:

1. Runtime-Env initialisieren
2. Systemrollen und Masterdata-Defaults sicherstellen
3. Storage-Pfade initialisieren
4. Routen registrieren
5. Backup-Scheduler starten
6. Fehlerhandler registrieren
7. In `development`: Vite-Integration; in `production`: statische Assets ausliefern

### 2.3 DB-Sicherheitsarchitektur

`server/db.ts` erzwingt vor Pool-Erzeugung harte Zielprüfungen:

- Mode-basierte Allowlist-Prüfung für DB-Name und Host
- Im Testmodus zusätzlich: `assertTestMode()` + `assertSafeWriteTargetForTestMode()` (`*_test`)

Guard-Implementierung: `server/security/dbSafetyGuards.ts`.

## 3. Architekturprinzipien

### 3.1 Contract-First

Alle API-Endpunkte werden zentral in `shared/routes.ts` definiert (Methode, Pfad, Input/Output-Schema). Route-Module verwenden diese Contracts.

### 3.2 Backend-Schichtung

Verbindliches Schichtmodell:

- Route (`server/routes/*Routes.ts`)
- Controller (`server/controllers/*Controller.ts`)
- Service (`server/services/*Service.ts`)
- Repository (`server/repositories/*Repository.ts`)

### 3.3 Frontend-Trennung

Frontend trennt strukturelle UI-Bausteine (`client/src/components/ui/*`) von fachlicher Verdrahtung in Seiten/Form-Komponenten (`client/src/components/*`, `client/src/pages/Home.tsx`) und Hooks (`client/src/hooks/*`).

### 3.4 Server als fachliche Wahrheit

Client-seitige UI-Regeln ergänzen nur UX; fachliche Invarianten werden serverseitig durchgesetzt.

## 4. API- und Routing-Architektur

Die zentrale Pipeline in `server/routes.ts` ist:

1. `sessionAuth`
2. `setupGate`
3. öffentliche `authRoutes`
4. `requireSessionUser`
5. `resolveUserRole`
6. `enforceAdminMaintenancePolicy`
7. fachliche Route-Module

Aktive Domänen-Routen umfassen u. a. Auth, Termine, Kalender, Kunden, Projekte, Mitarbeiter, Teams, Touren, Projektstatus, Notizen, Anhänge, User Settings, Backups, Demo Seed/Purge, Dokumentextraktion, Help-Texts, Masterdata, Admin Bulk Imports.

## 5. Rollen- und Zugriffsarchitektur

### 5.1 Autoritativer Rollen-Kontext

Der Request-Kontext wird serverseitig aufgebaut:

- `req.userId` aus Session (`requireSessionUser`)
- `req.userContext = { userId, roleCode, roleKey }` aus DB (`resolveUserRole`)

Rollenmapping (`server/settings/registry.ts`):

- `READER -> LESER`
- `DISPATCHER -> DISPONENT`
- `ADMIN -> ADMIN`

Client-Header sind keine Autorisierungsquelle.

### 5.2 Admin-Maintenance-Grenzen

`enforceAdminMaintenancePolicy` blockiert/steuert Admin-Endpunkte:

- nur `ADMIN`
- destruktive Admin-Operationen in `production` blockiert
- in `development`/`test` nur auf sicheren DB-Zielen gemäß Guards

## 6. Domänen- und Datenmodellarchitektur

Das relationale Modell ist in `shared/schema.ts` definiert. Zentrale Entitäten:

- Kunden (`customer`)
- Projekte (`project`)
- Termine (`appointments`)
- Mitarbeiter (`employee`)
- Teams (`teams`), Touren (`tours`)
- Projektstatus (`project_status`, Join `project_project_status`)
- Notizen/Vorlagen (`note`, `note_template`, Joins)
- Anhänge (`project_attachment`, `customer_attachment`, `employee_attachment`)
- User/Rollen (`users`, `roles`)
- User Settings (`user_settings_value`)
- Seed-Läufe (`seed_run`, `seed_run_entity`)
- Tags und Masterdata-Tabellen (FT27/FT28)

## 7. Fachliche Invarianten (serverseitig)

### 7.1 Termin-Relationspflicht

Termine sind fachlich gueltig, wenn entweder `appointments.projectId` gesetzt ist oder bei `projectId = null` eine direkte `customerId`-Zuordnung besteht; bei gesetzter `projectId` wird die Kundenbeziehung aus dem Projekt abgeleitet und auf Konsistenz geprueft.

### 7.2 Mitarbeiter-Overlap

Serverseitig blockierend umgesetzt:

- Konflikterkennung in `appointmentsService` via `appointmentsRepository.getConflictingEmployeesTx`
- Fehlercode `EMPLOYEE_OVERLAP_CONFLICT` (HTTP 409)
- Konflikt-Metadaten mit betroffenen Mitarbeitern

Evidenz: `server/services/appointmentsService.ts`, Integrationstests `tests/integration/server/appointments.employee-overlap*.test.ts`.

### 7.3 Historische Termine (Lock)

Historische Termine werden serverseitig blockiert (`PAST_APPOINTMENT_READONLY`).

Ist-Stand: sowohl `DISPONENT` als auch `ADMIN` können historische Termine nicht mutieren (`updateAppointment`/`deleteAppointment`), obwohl im Kalender weiterhin `isLocked` rolebasiert als Anzeige-Flag berechnet wird (`roleKey !== ADMIN`).

### 7.4 Archivierungsmodell

Stammdaten nutzen primär Aktiv-Flags (`isActive`) statt physischem Löschen; gleichzeitig existieren bewusst destruktive Spezialpfade für Test-/Admin-Reset und Demo-Purge unter Guards.

## 8. Kern-Datenflüsse

### 8.1 Kalender-Aggregation

`/api/calendar/appointments` liefert aggregierte Termine inkl. Projekt-, Kunden-, Tour-, Mitarbeiter-, Status- und Lock-Informationen. Views laden intervalbasiert (`fromDate`, `toDate`).

### 8.2 Listen-/Detailflüsse

Listen-Endpoints sind filter- und scopefähig (z. B. Termine, Kunden, Projekte, Mitarbeiter) und liefern UI-spezifische Aggregatsichten inkl. Zählern.

### 8.3 Mutationen

Mutationen laufen über dedizierte Endpunkte mit Versionierung/Fehlercodes (`VERSION_CONFLICT`, `BUSINESS_CONFLICT`, `VALIDATION_ERROR`, domain-spezifische Codes).

### 8.4 Anhänge

Upload/Download laufen domänenspezifisch, technisch zentralisiert:

- Upload-Helfer: `server/lib/attachmentFiles.ts`
- Download-Helfer: `server/lib/attachmentDownload.ts`

Delete ist systemweit deaktiviert (`405 Attachment deletion is disabled`) für Projekt- und Mitarbeiter-Delete-Endpunkte; für Customer existiert kein Delete-Endpoint im Contract.

### 8.5 Dokumentextraktion

Die aktive Pipeline ist deterministisch:

1. PDF-Text (`documentTextExtractor`)
2. Header-Parser (`documentHeaderDeterministicParser`)
3. Artikel-Parser (`documentArticleDeterministicParser`)
4. Normierung/Validierung (`extractionValidator`)

KI-Provider-Code ist vorhanden, aber nicht der aktive Hauptpfad für Kopf-/Artikel-Extraktion.

### 8.6 Backup/CalDAV

- Backup-Scheduler: täglich 02:00 Europe/Berlin, lock-geschützt
- Backup aktivierbar/deaktivierbar via globales Setting `backup_enabled`
- CalDAV Sync asynchron via Dispatcher-Queue und Sync-Log

### 8.7 Demo Seed/Purge

Seed/Purge ist ein separater Admin-Pfad mit Run-Tracking (`seed_run`, `seed_run_entity`) und guardierter, idempotenter Purge-Logik.

## 9. Frontend-Architektur

### 9.1 Navigations- und Screen-Orchestrierung

`client/src/pages/Home.tsx` steuert Hauptansichten, Kontextwechsel und Rückkehrkontexte (`calendarContextual`, Form-Rückwege).

### 9.2 Server-State-Architektur

TanStack Query ist die Server-State-Quelle. Globales Query-Default in `client/src/lib/queryClient.ts` (u. a. `staleTime: Infinity`, kein Auto-Retry).

### 9.3 Filter-/Listenmuster

`useListFilters` standardisiert Filterzustand + deterministischen Page-Reset auf `1` bei Filteränderung.

### 9.4 Settings-Architektur

`SettingsProvider` lädt/patcht serverseitig aufgelöste Settings (`/api/user-settings/resolved`, `/api/user-settings`) inklusive Version-Retry bei Konflikten.

## 10. Erweiterungspunkte

Neue Funktionalität folgt den bestehenden Pfaden:

- API: Contract zuerst, dann Route -> Controller -> Service -> Repository
- Kalenderweite Daten: bevorzugt Aggregation erweitern statt paralleler UI-Requests
- Neue Nebenobjekte: als eigene Entität + dedizierte Endpunkte
- Frontend: bestehende Layout-/List-/Dialog-Bausteine wiederverwenden

## 11. Bekannte Risiken / Architekturhinweise

- In einzelnen Dateien sind Mojibake-Spuren sichtbar (z. B. `Ungültig`, `Nächster`), also ein bestehendes Encoding-/Textkonsistenz-Risiko.
- Historische Terminregeln sind strenger als reine Admin-Ausnahmeannahmen; maßgeblich ist der aktuelle Service-Code.

## 12. Nicht-Ziele dieses Dokuments

- Keine vollständige Endpoint-Referenz mit jedem Feld (siehe `shared/routes.ts`)
- Keine Runbooks für einzelne operative Tasks (siehe `docs/implementation.md`)
- Keine Feature-Spezifikation pro FT-Text
