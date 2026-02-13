# FT14 User Roles - Implementation Log

## Meta
- Feature: FT (14) User Roles (Refactor & Autorisierung)
- Branch: `refactor/userroles`
- Basis-Branch: `refactor/filter-api`
- Start-Tag: `v_ft14_start` (zeigt auf `ecd3ea0`)
- Zeitraum: 2026-02-13
- Status: Implementiert (Phase 1-4), Phase 5 nicht aktiviert

## Pflichtbestaetigung
- architecture.md und rules.md gelesen und verstanden

## Scope-Grenzen (eingehalten)
- Keine DB-Schema-Aenderung, keine Migration
- Keine Kalender-Aggregationsaenderung
- Keine Query-Key-Strategieaenderung
- Keine neuen globalen Provider/Auth-Wrapper
- Middleware-Reihenfolge nicht umgebaut; nur zusaetzliche Middleware eingefuegt
- Phase 4 Navigation: genau ein neuer Navigationseintrag, keine Sidebar-Umstrukturierung

## Git-Vorbereitung (sequenziell)
1. Basis auf `refactor/filter-api` festgelegt.
2. `v_ft14_start` neu auf Basiscommit gesetzt und gepusht.
3. `refactor/userroles` auf dieselbe Basis abgeleitet und gepusht.

Verifikation:
- `refactor/filter-api` -> `ecd3ea0`
- `refactor/userroles` -> `ecd3ea0` (vor FT14-Commits)
- Tag `v_ft14_start` -> `ecd3ea0`

---

## Phase 1 - central server-side role resolution
Commit: `049164c`
Message: `FT14 Phase1: central server-side role resolution`

### Ziel
Serverseitiger, autoritativer Rollen-Request-Kontext ohne Header-Autorisierung.

### Umsetzung

#### 1) Request-Kontext erweitert
Datei: `server/middleware/requestUserContext.ts`
- `RequestUserContext` eingefuehrt:
  - `userId`
  - `roleCode`
  - `roleKey`
- Express `Request` erweitert um:
  - `userId?`
  - `userContext?`

#### 2) Striktere SETTINGS_USER_ID-Validierung
Datei: `server/middleware/requestUserContext.ts`
- Kein implizites Defaulting mehr auf `1`
- Fehler, wenn `SETTINGS_USER_ID` fehlt/ungueltig/<=0

#### 3) Neue Rollen-Middleware
Datei: `server/middleware/resolveUserRole.ts`
- Liest `req.userId`
- Laedt User+Role via `usersRepository.getUserWithRole`
- Prueft:
  - User vorhanden
  - User aktiv
  - gueltiger roleCode
- Setzt `req.userContext = { userId, roleCode, roleKey }`

#### 4) Startup-Guard eingefuehrt
Datei: `server/bootstrap/assertConfiguredSystemUser.ts`
Einbindung: `server/index.ts`
- Vor Start wird geprueft:
  - `SETTINGS_USER_ID` gesetzt/gueltig
  - User existiert
  - User ist aktiv
  - User hat Rolle `ADMIN`
- Bei Verstoß: klarer Startabbruch mit expliziter Fehlermeldung

#### 5) Middleware-Reihenfolge (verbindlich)
Datei: `server/routes.ts`
- API-Middleware exakt in Reihenfolge registriert:
  - `attachRequestUserContext`
  - `resolveUserRole`
- Keine Umordnung sonstiger Middleware-Ketten

#### 6) route-lokale UserContext-Middleware entfernt
Datei: `server/routes/userSettingsRoutes.ts`
- route-spezifisches `attachRequestUserContext` entfernt
- nutzt jetzt zentrale API-Middlewarekette

#### 7) Backend-Rollenquelle auf Request-Kontext umgestellt
Dateien:
- `server/controllers/appointmentsController.ts`
- `server/controllers/employeesController.ts`
- `server/services/appointmentsService.ts`

Aenderung:
- `x-user-role` Auswertung entfernt
- Service-Schnittstellen von `isAdmin:boolean` auf `roleKey` umgestellt

### Ergebnis
- Rollenauflosung ist serverseitig autoritativ aus DB (`users -> roles`)
- Kein Header-basierter Rollenentscheid im Backend
- System laeuft nur mit gueltigem ADMIN-System-User an

### Pflichtchecks nach Phase
- `npm run check` -> OK
- `npm run build` -> OK

---

## Phase 2 - enforce lock rule server-side
Commit: `36aba1c`
Message: `FT14 Phase2: enforce lock rule server-side`

### Ziel
Lock-Regel fachlich serverseitig absichern mit deterministischem 403.

### Umsetzung
Dateien:
- `server/services/appointmentsService.ts`
- `server/controllers/appointmentsController.ts`

Details:
- Bei gesperrtem Termin und `roleKey !== "ADMIN"`:
  - Mutation wird blockiert (Update/Delete)
  - Fehlerstatus `403`
  - maschinenlesbar: `field: "APPOINTMENT_LOCKED"`

Technik:
- `AppointmentError` um optionalen `code` erweitert
- Controller gibt `{ message, field }` zurueck

### Ergebnis
- Lock-Entscheidung nicht vom Client abhaengig
- 403-Fehlerformat deterministisch und maschinenlesbar

### Pflichtchecks nach Phase
- `npm run check` -> OK
- `npm run build` -> OK

---

## Phase 3 - remove header-based role logic
Commit: `61fbe7c`
Message: `FT14 Phase3: remove header-based role logic`

### Ziel
Projektweite Entfernung von `x-user-role` und Header-Rollenlogik.

### Umsetzung
Header `x-user-role` aus allen Request-Stellen entfernt.

Betroffene Dateien:
- `client/src/lib/calendar-appointments.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/EmployeesPage.tsx`
- `client/src/components/ProjectAppointmentsPanel.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/calendar/CalendarMonthView.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`

### Nachweis
- Volltextsuche nach `x-user-role` im Projekt -> keine Treffer

### Ergebnis
- Keine Header-Rollenabhaengigkeit mehr
- Backend-Rollenentscheidungen laufen ueber `req.userContext.roleKey`

### Pflichtchecks nach Phase
- `npm run check` -> OK
- `npm run build` -> OK

---

## Phase 4 - introduce user role management UI
Commit: `5578d8b`
Message: `FT14 Phase4: introduce user role management UI`

### Ziel
ADMIN kann Benutzerrollen verwalten (minimaler Umfang, ohne Sidebar-Refactor).

### Backend

#### Contract
Datei: `shared/routes.ts`
Neu:
- `GET /api/users`
- `PATCH /api/users/:id` mit Body `{ roleCode }`

#### Repository-Erweiterung
Datei: `server/repositories/usersRepository.ts`
Neu:
- `listUsersWithRoles()`
- `getUserRoleRecordById()`
- `getRoleIdByCode()`
- `updateUserRoleById()`
- `countActiveAdmins(excludeUserId?)`

#### Service
Datei: `server/services/usersService.ts`
Neu:
- `listUsers(userContext)` (ADMIN-only)
- `changeUserRole(userContext, targetUserId, roleCode)`

Schutzregeln:
- Nur ADMIN darf Rollen wechseln
- Letzter ADMIN darf nicht entfernt werden
- Self-demotion des letzten ADMIN ist blockiert

#### Controller/Route
Dateien:
- `server/controllers/usersController.ts`
- `server/routes/usersRoutes.ts`
- `server/routes.ts` (Route registriert)

### Frontend

#### Neuer Screen
Datei: `client/src/components/UsersPage.tsx`
Funktion:
- Benutzerliste
- Rollenanzeige
- Rollenwechsel per Save pro Zeile

#### Navigation (minimal)
Datei: `client/src/components/Sidebar.tsx`
- Genau ein neuer Eintrag: `Benutzerverwaltung`
- Keine Umgruppierung/Umbenennung bestehender Navigation

#### View-Einbindung
Datei: `client/src/pages/Home.tsx`
- Neuer View-Typ `users`
- Render von `UsersPage`

### Ergebnis
- ADMIN kann Userrollen sehen und aendern
- Nicht-ADMIN wird serverseitig blockiert
- Letzter ADMIN bleibt geschuetzt

### Pflichtchecks nach Phase
- `npm run check` -> OK
- `npm run build` -> OK

---

## Phase 5 Gate-Pruefung
Gate-Bedingung:
- mindestens 3 identische redundante Rollenpruefungen

Ergebnis:
- Gate nicht aktiviert
- Keine zusaetzliche roleGuard-Abstraktion eingefuehrt
- Vorgabe eingehalten: kein praeventives Refactoring

---

## Architektur-Dokumentation
Commit: `8545808`
Message: `FT14 Docs: document authoritative role model`

Datei:
- `.ai/architecture.md`

Ergaenzt:
- Abschnitt `Rollenmodell - autoritativ`
- technische Konsequenzen:
  - `req.userContext` als serverseitige Rollenquelle
  - Ausschluss von `x-user-role` als Autorisierungsquelle
  - Lock-Regel serverseitig
  - Startup-Guard fuer ADMIN-System-User

---

## Check-/Build-Nachweise (final)
Final ausgefuehrt:
- `npm run check` -> OK
- `npm run build` -> OK

---

## Commit-Historie (FT14)
1. `049164c` - FT14 Phase1: central server-side role resolution
2. `36aba1c` - FT14 Phase2: enforce lock rule server-side
3. `61fbe7c` - FT14 Phase3: remove header-based role logic
4. `5578d8b` - FT14 Phase4: introduce user role management UI
5. `8545808` - FT14 Docs: document authoritative role model

---

## Zusatzeintrag: Build-Fix Kontext
Im Verlauf gab es initial einen vorhandenen, nicht-FT14-spezifischen Check-Blocker (`deleteProject` Typluecke in altem Pfad). Die FT14-Arbeit wurde danach auf der korrekten Basis `refactor/filter-api` neu aufgesetzt und sauber in `refactor/userroles` umgesetzt.

---

## Ergebniszusammenfassung
FT14 ist in den geforderten Phasen 1-4 umgesetzt. Rollen- und Lock-Autorisierung sind serverseitig, header-unabhaengig und deterministisch. Benutzerverwaltung (minimal) ist fuer ADMIN verfuegbar. Architektur-Doku ist nachgezogen. Phase 5 wurde regelkonform nicht aktiviert.
