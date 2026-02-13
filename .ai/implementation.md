# MuGPlan – Engineering Handbook (Ist‑Stand)

## Zweck dieser Datei

Diese Datei ist das praktische Arbeits‑ und Betriebs‑Handbuch zur MuGPlan‑Codebasis. Sie ergänzt `architecture.md`, ohne Feature‑ und Use‑Case‑Texte zu duplizieren. Fachliche Abläufe und ausführliche Use‑Cases werden ausschließlich in der zentralen Feature‑/Use‑Case‑Sammlung beschrieben; hier stehen nur die technischen Konsequenzen, Konventionen und Handgriffe, die ein Entwickler beim Arbeiten am Code unmittelbar braucht.

## Was diese Datei bewusst nicht ist

Diese Datei ist keine zweite Architekturbeschreibung und keine Wiederholung der Feature‑Texte. Wenn etwas „warum fachlich“ ist, gehört es in die Feature‑/Use‑Case‑Dokumentation. Wenn etwas „wie im Code“ ist, gehört es hierher.

---

# 1. Projektbetrieb

## 1.1 Start‑ und Build‑Modell

MuGPlan wird als gemeinsamer Dev‑Prozess betrieben, in dem das Backend die REST‑API bereitstellt und im Development Vite so integriert wird, dass Frontend und Backend zusammen laufen. Im Production‑Modus liefert der Server die gebauten statischen Assets aus.

## 1.2 Konfiguration (Environment)

Das Backend benötigt Zugangsdaten zur Datenbank sowie ggf. Pfade für Upload‑Speicher. Diese Werte werden über Environment‑Variablen bereitgestellt. Wenn eine Variable fehlt oder falsch ist, ist die Regel, zuerst den Serverstart und die DB‑Verbindung zu verifizieren, bevor man „symptomatisch“ an einzelnen Endpunkten debuggt.

## 1.3 Datenbank‑Realität

Im Ist‑Stand ist die Persistenz MySQL‑basiert. Schema und referentielle Integrität sind im MySQL‑Dump vollständig sichtbar. Die Backend‑Implementierung nutzt Drizzle ORM und mysql2. Bei Schema‑Änderungen ist das Archivierungsmodell zu respektieren, und Cascades in Join‑Tabellen sind bewusst zu prüfen.

---

# 2. Code‑Konventionen, die man einhalten muss

## 2.1 Contracts sind der API‑Vertrag

Die API‑Oberfläche wird zentral über `shared/routes.ts` als Contract‑Index definiert. Route‑Module benutzen diese Contract‑Pfadstrings. Für JSON‑Requests validieren und parsen Controller über die Contract‑Schemas. Multipart‑Requests (insbesondere Uploads) sind ein definierter Sonderfall mit Multipart‑Parser und technischen Limits in der Controller‑Schicht. Neue Endpunkte werden nie „frei“ in Express definiert, sondern immer zuerst im Contract ergänzt.

## 2.2 Schichten im Backend

Backend‑Änderungen folgen der Kette Route → Controller → Service → Repository.

Der Controller ist für Parsing und Validierung zuständig und soll keine Fachlogik enthalten. Für JSON‑Requests erfolgt Parsing/Validierung über Contracts; für Multipart‑Requests über den vorgesehenen Multipart‑Parser mit Limits.

Der Service ist der Ort für Fachregeln, Aggregation und Querbezüge zwischen Entitäten.

Das Repository kapselt Datenbankzugriffe und verhindert, dass Query‑Details in den Service diffundieren.

## 2.3 UI‑Bausteine bleiben strukturell

Im Frontend bleiben wiederverwendbare UI‑Bausteine strukturell. Fachlogik gehört nicht in generische Layout‑ oder UI‑Komponenten, sondern in Page‑Ebene und fachnahe Hooks.

## 2.4 React Query ist die Server‑State‑Wahrheit

Server‑State wird über TanStack React Query verwaltet. Mutationen invalidieren die betroffenen Queries, statt lokale „Korrekturzustände“ zu erzeugen. Optimistic UI ist die Ausnahme und wird nur dort genutzt, wo fachliche Regeln sicher nicht betroffen sind oder ein Rollback sauber möglich ist.

---

# 3. Praktische Arbeitsmuster im Code

## 3.1 Einen neuen Endpunkt hinzufügen

Zuerst wird im Contract‑Index (`shared/routes.ts`) eine neue Definition ergänzt (Path und Zod‑Schemas).

Danach wird im passenden `server/routes/*Routes.ts` der Endpunkt registriert, indem exakt der Contract‑Path verwendet wird.

Im Controller wird JSON‑Input über das Contract‑Schema geparst; Multipart‑Input wird über den vorgesehenen Multipart‑Parser mit Limits verarbeitet. Die Ausführung wird anschließend an einen Service delegiert.

Im Service werden Fachregeln durchgesetzt und für Persistenz wird ein Repository genutzt.

## 3.2 Eine neue Liste/Verwaltungsseite hinzufügen

Neue Listen-Screens sollen die verbindliche ListLayout-Kompositionsschicht nutzen:

- `ListLayout` als Shell
- `BoardView` für Board/Grid-Darstellung
- `TableView<T>` für Tabellen-Darstellung

Legacy-Listenlayouts sind kein aktiver Architekturpfad mehr.

Formulare und Dialoge werden bevorzugt über die vorhandenen Edit-Dialog-Bausteine umgesetzt, statt neue Dialog-Paradigmen einzuführen.

## 3.3 Ein neues Sidepanel im Detail‑Kontext hinzufügen

Panels werden als klar abgegrenzte Child‑Collections verstanden und folgen dem `SidebarChildPanel`‑Pattern. Neue Panels dürfen nicht implizit Seiteneffekte auf andere Panels auslösen, sondern müssen über klare Props und Query‑Hooks gekoppelt sein.

## 3.4 Kalenderfeatures erweitern

Kalenderfeatures sind systemkritisch. Neue kalenderrelevante Daten gehören in die serverseitige Aggregation, damit alle Views konsistent bleiben. Die Views sollen nicht durch zusätzliche parallele Requests auseinanderdriften.

## 3.5 Sidebar Appointment Panels (upcoming-only, compact, employee cap=5)

Der Sidebar-Terminbereich wurde auf ein upcoming-only Pattern vereinheitlicht.

`AppointmentsPanel` rendert im Ist-Stand keinen Show-All-Toggle mehr. Stattdessen ist die Darstellung rein listenbasiert und kann über `compact` sowie `sidebarFooter` gesteuert werden.

`ProjectAppointmentsPanel` und `CustomerAppointmentsPanel` laden nur noch Termine ab heute. Historische Umschaltung (`showAll`) ist in diesen Panels entfernt.

`EmployeeAppointmentsPanel` sortiert upcoming Termine chronologisch, zeigt maximal 5 Einträge und kann bei mehr Treffern einen Footer-Button "Mehr anzeigen" rendern. Der Trigger wird über `onOpenEmployeeAppointmentsView(employeeId)` nach außen delegiert.

Wichtige Dateien:

- `client/src/components/AppointmentsPanel.tsx`
- `client/src/components/ProjectAppointmentsPanel.tsx`
- `client/src/components/CustomerAppointmentsPanel.tsx`
- `client/src/components/EmployeeAppointmentsPanel.tsx`
- `client/src/components/ui/termin-info-badge.tsx`

## 3.6 Kalender Preview, CompactBar und Mehrtages-Rendering

Monat/Jahr-Preview:

`CalendarAppointmentPopover` rendert die Weekly-Karte `CalendarWeekAppointmentPanel` mit `interactive={false}`. Die Preview ist damit strukturell identisch zur Wochenkarte, aber read-only (kein Drag, kein DoubleClick im Popover).

Wochenansicht Mehrtagestermine:

In `CalendarWeekView` wird der Starttag eines Mehrtagestermins als volle Karte gerendert. Folgetage verwenden `segment="continuation"` in `CalendarWeekAppointmentPanel` und zeigen eine schraffierte Fortsetzung ohne sichtbaren Karteninhalt. Über `hoveredAppointmentId` werden alle Segmente eines Termins gemeinsam hervorgehoben.

Monatsansicht Mehrtagestermine:

`CalendarMonthView` verwendet Week-Lanes mit `startIndex`/`endIndex` und positioniert Balken über lane-basierte Geometrie. Mehrtagestermine werden als durchgehende Segmente pro Woche gezeichnet.

CompactBar-Content-Regeln (Monat/Jahr):

- Ein-Tag: links `K: <Nummer>`, rechts `PLZ: <PLZ>`
- Mehrtag: links `K: <Nummer> - Name: <FullName>`, rechts `PLZ: <PLZ>`
- Preview-Popup folgt dem Mauszeiger mit kleinem Offset.

Wichtige Dateien:

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthView.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`
- `client/src/components/calendar/CalendarAppointmentPopover.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`

## 3.7 ProjectStatus Panel Pattern

Die Projektstatus-Darstellung im Projektformular läuft über ein domänenspezifisches Pattern:

- Panel-Wrapper: `ProjectStatusPanel`
- Badge-Wrapper: `ProjectStatusInfoBadge`

Die frühere `ProjectStatusSection` wird im aktuellen Ist-Stand nicht mehr verwendet.

Wichtige Dateien:

- `client/src/components/ProjectStatusPanel.tsx`
- `client/src/components/ui/project-status-info-badge.tsx`
- `client/src/components/ProjectForm.tsx`

## 3.8 RichTextEditor: Clipboard-Sanitizing

`RichTextEditor` fängt `onPaste` ab und übernimmt ausschließlich `text/plain`. HTML-Formatierungen aus der Zwischenablage werden nicht in den Editor übernommen.

Wichtige Datei:

- `client/src/components/RichTextEditor.tsx`

## 3.9 List Architecture Playbook

Für neue Listen- oder Verwaltungsseiten gilt folgende Reihenfolge:

1. `ListLayout` als strukturelle Shell anlegen (Titel, Icon, optional `helpKey`, Slots).
2. Filter in `filterSlot` platzieren; Default ist bottom-docked (`filterPlacement="bottom"`).
3. Falls beide Darstellungen benötigt werden:
   - Board via `BoardView`
   - Tabelle via `TableView`
   - Umschaltung via `viewModeToggle`.
4. ViewMode über Settings-Key persistieren (`<screen>.viewMode`) und auf `board` defaulten.
5. Tabelleninteraktion strikt halten:
   - Sortierung in der Page
   - optional `rowPreviewRenderer`
   - Selektion/Öffnen nur via `onRowDoubleClick`
   - keine Single-Click-Aktion.
6. Nach Mutationen relevante Query-Keys invalidieren, keine lokalen Schattenzustände aufbauen.

## 3.10 Table-only Pattern

Table-only wird eingesetzt, wenn kein Board-Mehrwert vorhanden ist oder wenn eine Dialogliste als präziser Auswahldialog dient.

Regeln:

- Kein `viewModeToggle`.
- `ListLayout` bleibt dennoch der Shell-Standard.
- `TableView` enthält alle Interaktionen (Hover-Preview, Double-Click-Aktion).

Referenz:

- `client/src/components/AppointmentsListPage.tsx` (table-only Hauptscreen, serverseitiges Paging).

## 3.11 Dialog table-only Pattern

Dialoglisten verwenden dasselbe Architekturmuster wie Hauptscreens, aber table-only:

- `ProjectsPage` mit `tableOnly` im Projektpicker von `AppointmentForm`.
- `CustomersPage` mit `tableOnly` im Kundenpicker von `ProjectForm`.
- `EmployeePickerDialogList` als dedizierter Dialogscreen (`ListLayout` + `TableView`).
- `EmployeeAppointmentsTableDialog` als table-only Terminliste im Employee-Kontext.

Interaktionsvertrag:

- Hover zeigt Preview (`rowPreviewRenderer`).
- Double-Click selektiert/öffnet.
- Single-Click bleibt ohne Aktion.

## 3.12 ListLayout-Dateilandkarte (Ist-Stand)

Kernkomponenten:

- `client/src/components/ui/list-layout.tsx`
- `client/src/components/ui/board-view.tsx`
- `client/src/components/ui/table-view.tsx`
- `client/src/components/ui/hover-preview.tsx`

Listenscreens:

- `client/src/components/HelpTextsPage.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/EmployeesPage.tsx`
- `client/src/components/NoteTemplatesPage.tsx`
- `client/src/components/ProjectStatusList.tsx`
- `client/src/components/TeamManagement.tsx`
- `client/src/components/TourManagement.tsx`
- `client/src/components/AppointmentsListPage.tsx`

Dialoglisten:

- `client/src/components/EmployeePickerDialogList.tsx`
- `client/src/components/EmployeeAppointmentsTableDialog.tsx`

## 3.13 Verifikations-Checkliste für Doku-Konsistenz

Nach Änderungen an Listenarchitektur oder Navigation:

1. Legacy-Referenzen suchen:
   - alte ListLayout-Symbole und gelöschte Listenscreen-Pfade
2. In `.ai/architecture.md` und `.ai/implementation.md` nur aktive Architekturpfade dokumentieren.
3. Screen-Matrix gegen `client/src/pages/Home.tsx` und `client/src/components/Sidebar.tsx` gegenprüfen.
4. Listenschnittstellen gegen `list-layout.tsx`, `board-view.tsx`, `table-view.tsx` verifizieren.
5. Terminliste-Fluss gegen `shared/routes.ts` (`GET /api/appointments/list`) sowie Controller/Service/Repository abgleichen.

## 3.14 Filter-State-API Playbook (`useListFilters`)

Für Listen- und kalendernahe Filterstate-Verwaltung ist `client/src/hooks/useListFilters.ts` der Standard.

Kernvertrag:

1. `filters` hält den typisierten lokalen Filterzustand.
2. `page` hält den Paginationzustand.
3. `setFilter(key, value)` setzt deterministisch `page` auf `1`.
4. `resetFilters()` setzt `filters` auf den Initialzustand und `page` auf `1`.
5. Optional können `queryParams` über einen Builder abgeleitet werden.

Aktueller Integrationsstand:

* `CustomersPage`, `EmployeesPage`, `ProjectsPage` nutzen `useListFilters`.
* `Home.tsx` nutzt `useListFilters` für den Kalender-Mitarbeiterfilter.
* `AppointmentsListPage` bleibt aktuell bewusst beim lokalen Pattern mit identischer Regel `setPage(1)` bei Filteränderung.

Praktische Leitplanke:

* Neue Listen verwenden `setFilter(...)` für Feldupdates.
* Wenn komplexe Feldtransformationen nötig sind (z. B. Array-Filter), bleibt die Semantik identisch: Ergebnisfilter setzen und Pagination auf `1`.

---

# 4. Fehlerbehandlung und Debugging

## 4.1 Validierungsfehler vs. Fachfehler

Validierungsfehler entstehen, wenn Requests nicht dem Contract entsprechen. Diese werden als 400 beantwortet und sollen im Frontend als formale Eingabefehler behandelt werden.

Fachfehler entstehen, wenn Requests formal korrekt sind, aber gegen Regeln verstoßen. Diese werden als explizite Service‑Errors modelliert und mit passendem Statuscode und einer maschinenlesbaren Message beantwortet.

Für die Hard-Rule zur Mitarbeiter-Überschneidungsprüfung bei Terminzuweisungen konnte im Gegencheck der aktuelle Implementationsstand der serverseitigen Konfliktblockierung nicht eindeutig bestätigt werden. Diese Regel bleibt fachlich verbindlich als Zielzustand, ist im Ist‑Stand aber noch nicht zuverlässig verifiziert beziehungsweise noch nicht vollständig umgesetzt.

Zur belastbaren Absicherung der Hard-Rule ist daher eine separate Implementations-/Refactoring-Aufgabe notwendig, die die serverseitige Konfliktblockierung eindeutig herstellt und verifizierbar macht.

## 4.2 Lock‑ und Rollenprobleme

Wenn Interaktionen im Kalender „nicht gehen“, wird zuerst geprüft, ob der Termin gesperrt ist und welcher Rollenwert im serverseitigen Request-Kontext (`req.userContext.roleKey`) vorliegt. Die UI blockiert Interaktionen clientseitig über das Lock-Flag; der Server erzwingt dieselbe Regel autoritativ.

## 4.3 Typische Debug‑Reihenfolge

Wenn etwas nicht funktioniert, wird zuerst der Contract geprüft, dann der Controller‑Parse, dann der Service‑Pfad und erst danach das Repository. Diese Reihenfolge verhindert, dass man Datenbankqueries debuggt, obwohl der Request bereits an der Validierung scheitert.

---

# 5. Footguns und Hotspots

## 5.1 Kalender‑Repository Stabilität

Im Projektmaterial ist eine Auffälligkeit im Kalender‑Repository vermerkt, die auf inkonsistente Variablen im Scope hindeutet. Bei Änderungen rund um Kalenderdaten ist deshalb der erste Schritt immer, Build und Typecheck in diesem Pfad zu verifizieren, bevor neue Logik ergänzt wird.

## 5.2 Archivierung statt Löschen

Viele Entitäten sind fachlich als „archivierbar“ modelliert. Implementierungen dürfen nicht von physischem Löschen ausgehen, weil historische Zuordnungen erhalten bleiben müssen.

---

# 6. Verweise statt Duplikation

Für fachliche Details, Ablauftexte und vollständige Use‑Cases gilt: Diese Datei verweist nur.

Die maßgebliche Quelle für Feature‑ und Use‑Case‑Texte ist die zentrale Feature‑/Use‑Case‑Sammlung. In Architektur‑ und Implementierungsdokumenten wird maximal die technische Konsequenz (Invarianten, Validierung, Datenflüsse, Schnittstellen) beschrieben.

---

# 7. FT (18) User Settings - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die konkrete technische Umsetzung von FT (18) in der Codebasis. Ziel ist, dass ein Entwickler nicht nur versteht, was gebaut wurde, sondern auch reproduzierbar darauf aufbauen kann.

## 7.1 Zielbild von FT (18)

FT (18) liefert eine Settings-Infrastruktur mit:

- zentraler Registry,
- Scope-Auflösung (`GLOBAL`, `ROLE`, `USER`),
- serverseitiger Auflösung (kein Frontend-Fallback auf Defaults),
- Contract-First Endpunkten fuer Resolve und Set,
- zentralem Frontend-Provider und Landing-Page unter "Einstellungen".

## 7.2 Relevante Dateien (Backend)

### Shared Contract und Schema

- `shared/routes.ts`
  Enthaelt die Contracts `api.userSettings.getResolved` und `api.userSettings.set`.
- `shared/schema.ts`
  Enthält:
  - `roles`
  - `users`
  - `user_settings_value`

### Route/Controller/Service/Repository

- `server/routes/userSettingsRoutes.ts`
- `server/controllers/userSettingsController.ts`
- `server/services/userSettingsService.ts`
- `server/repositories/userSettingsRepository.ts`
- `server/repositories/usersRepository.ts`
- `server/settings/registry.ts`
- `server/middleware/requestUserContext.ts`
- `server/routes.ts` (Route-Registrierung)

## 7.3 Relevante Dateien (Frontend)

- `client/src/providers/SettingsProvider.tsx`
- `client/src/hooks/useSettings.ts`
- `client/src/components/SettingsPage.tsx`
- `client/src/App.tsx` (Provider-Einbindung)
- `client/src/pages/Home.tsx` (View-Erweiterung)
- `client/src/components/Sidebar.tsx` (bestehender Menüpunkt aktiv)

## 7.4 Scope-Modell und Persistenzkonventionen

### 7.4.1 Erlaubte Scopes

Es gelten genau drei Scopes:

- `GLOBAL`
- `ROLE`
- `USER`

### 7.4.2 Persistenzregeln in `user_settings_value`

Die Persistenz erfolgt in der Tabelle `user_settings_value` mit den folgenden relevanten Feldern:

- `id`
- `setting_key`
- `scope_type` (`GLOBAL|ROLE|USER`)
- `scope_id`
- `value_json`
- `updated_at`
- `updated_by` (optional)

Unique-Constraint:

- `(setting_key, scope_type, scope_id)`

Scope-Konventionen:

- `GLOBAL`: `scope_id = "global"`
- `ROLE`: `scope_id = DB-Rollencode` (`READER|DISPATCHER|ADMIN`), bewusst nicht numerische `role_id`
- `USER`: `scope_id = userId` als String

Diese Konventionen sind nicht optional, sondern stabiler Teil des Datenmodells.

### 7.4.3 Registry-Beispiel und Default-Herkunft

Wichtige produktive Registry-Keys im aktuellen Stand:

- `attachmentPreviewSize` (`small|medium|large`, Default `medium`)
- `cardListColumns` (Board-Spalten, 2..6)
- `helptexts.viewMode` (`board|table`)
- `projects.viewMode` (`board|table`)
- `customers.viewMode` (`board|table`)
- `employees.viewMode` (`board|table`)

Wenn für einen Scope kein persistierter Wert in `user_settings_value` vorliegt (oder kein gültiger Kandidat aufgelöst werden kann), stammt der wirksame Default aus der Settings-Registry (`DEFAULT` in der Resolver-Reihenfolge), nicht aus einer impliziten DB-Vorgabe.

## 7.5 Rollenmodell und Mapping

### 7.5.1 DB-Rollen (persistiert)

- `READER`
- `DISPATCHER`
- `ADMIN`

### 7.5.2 Kanonische Rollen (Resolver/API/UI)

- `LESER`
- `DISPONENT`
- `ADMIN`

Mapping erfolgt serverseitig im Settings-Kontext:

- `READER -> LESER`
- `DISPATCHER -> DISPONENT`
- `ADMIN -> ADMIN`

Wichtig: Storage bleibt bei DB-Codes, API liefert kanonische Semantik.

## 7.6 Resolver-Ablauf im Service

`userSettingsService` arbeitet in dieser Reihenfolge:

1. User-Kontext prüfen (`userId` vorhanden)
2. `usersRepository` liest User + Rollen-Code aus DB
3. Rollen-Code validieren und kanonisieren
4. Repository lädt Kandidatenwerte für den User:
   - USER-Kandidat
   - ROLE-Kandidat
   - GLOBAL-Kandidat
5. Pro Setting-Key Auflösung strikt:
   - USER > ROLE > GLOBAL > DEFAULT
6. Invalid persistierte Werte (Validator fail) werden ignoriert und zur nächsten Stufe gefällt
7. Response-Objekt inkl. `resolvedScope`, `roleCode`, `roleKey` wird gebaut

## 7.7 Contract-First Response-Semantik

Der Endpunkt `GET /api/user-settings/resolved` liefert pro Key mindestens:

- `defaultValue`
- `globalValue?`
- `roleValue?`
- `userValue?`
- `resolvedValue`
- `resolvedScope`
- `roleCode`
- `roleKey`

Damit kann die Landing-Page die Herkunft eines Werts anzeigen, ohne Resolverlogik im Client.

## 7.8 Frontend-Verwendung

### 7.8.1 Provider und Hooks

`SettingsProvider` kapselt Laden, Fehlerzustand und Retry.

`useSettings()` liefert den Gesamtzustand.

`useSetting(key)` liefert den wirksamen Wert key-basiert, ohne Prop-Drilling.

### 7.8.2 Landing-Page

`SettingsPage` zeigt je Key:

- Label
- wirksamen Wert (`resolvedValue`)
- Herkunft (`resolvedScope`)

und bietet im Ist-Stand Save-Flows fuer ausgewaehlte Keys (Scope- und Wertevalidierung weiterhin serverseitig).

## 7.9 Seed und Migration

### 7.9.1 Rollen-Seed

- Script: `script/seed-roles.ts`
- NPM Script: `db:seed:roles`

Seed ist idempotent und arbeitet mit DB-Codes (`READER`, `DISPATCHER`, `ADMIN`).

### 7.9.2 SQL-Datei

- `migrations/2026-02-07_ft18_settings_scopes.sql`

Enthält Tabellen/Constraints für:

- `roles`
- `users`
- `user_settings_value`

inkl. Rollen-Insert via `ON DUPLICATE KEY UPDATE`.

## 7.10 Betriebshinweise und aktuelle Übergangslösung

Der langfristige Zielzustand ist echter Auth-Kontext mit serverseitig ermittelter `userId`.

Aktuell wird für FT (18) `req.userId` übergangsweise über `SETTINGS_USER_ID` gesetzt (`requestUserContext`). Das ist eine bewusst begrenzte Lösung, um FT (18) ohne parallele Auth-Replattforming-Arbeit auslieferbar und testbar zu machen. Dieser Mechanismus liefert im aktuellen Entwicklungsstand ausschließlich den Identitätsinput und ersetzt keine Authentifizierung und keine Session.

Die Rollenauflösung selbst bleibt trotzdem DB-basiert (`users -> roles`) und wird nicht aus Frontenddaten abgeleitet. "Serverseitig" bedeutet hier die autoritative Rollenquelle aus der DB, nicht bereits einen vollständig authentifizierten Session-Kontext.

Diese DB-basierte Rollenauflösung ist das autoritative Modell. Rollenentscheidungen im Kalender-/Terminbereich erfolgen serverseitig über `req.userContext.roleKey`. Client-Header sind keine Rollenquelle.

## 7.11 Verifikation von FT (18)

Durchgeführt und erfolgreich:

- `npm run check`
- `npm run build`

Empfohlene manuelle Prüfpunkte:

1. Menüpunkt "Einstellungen" öffnet Landing-Page.
2. Endpunkt `GET /api/user-settings/resolved` liefert Payload mit `resolvedScope`.
3. Endpunkt `PATCH /api/user-settings` persistiert gueltige Werte und liefert aktualisierte resolved Payload.
4. Bei Fehler zeigt Landing-Page sinnvollen Fehlerzustand mit Retry.
5. ROLE-Werte greifen nur für die zum User gehörige DB-Rolle.

## 7.12 Follow-up nach FT (18)

Wenn Auth-System erweitert wird, sollte zuerst `requestUserContext` durch echte Auth-Middleware ersetzt werden. Der Resolver- und Persistenzkern von FT (18) kann dabei unverändert bleiben, solange `userId` verlässlich aus dem Request-Kontext kommt.

Write-Endpunkte für Settings sollten dieselben Regeln wiederverwenden:

- Scope-Gültigkeit über `allowedScopes`
- Rollenmapping zentral im Backend
- keine clientseitige Scope- oder Defaultlogik

---

# 8. FT (14) User Roles - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die konkrete technische Umsetzung von FT (14): serverseitiger Rollen-Request-Kontext, Lock-Autorisierung, Entfernung der Header-Rollenquelle und minimale Benutzer-/Rollenverwaltung.

## 10.1 Zielbild

FT (14) etabliert ein autoritatives Rollenmodell im Backend ohne Auth-Replattforming:

- Rollenquelle ausschließlich DB (`users -> roles`)
- Request-Kontext `req.userContext = { userId, roleCode, roleKey }`
- kein `x-user-role` als Autorisierungsquelle
- Termin-Lock-Regel serverseitig und deterministisch (`403`, `APPOINTMENT_LOCKED`)
- minimale Admin-UI fuer Benutzerrollen

## 10.2 Relevante Dateien (Backend)

- `server/middleware/requestUserContext.ts`
- `server/middleware/resolveUserRole.ts`
- `server/bootstrap/assertConfiguredSystemUser.ts`
- `server/routes.ts` (globale API-Middlewarekette)
- `server/controllers/appointmentsController.ts`
- `server/services/appointmentsService.ts`
- `server/controllers/employeesController.ts`
- `server/repositories/usersRepository.ts`
- `server/services/usersService.ts`
- `server/controllers/usersController.ts`
- `server/routes/usersRoutes.ts`
- `shared/routes.ts` (Contracts fuer `/api/users`)

## 10.3 Relevante Dateien (Frontend)

- `client/src/components/UsersPage.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/pages/Home.tsx`
- Header-Entfernung in Termin-/Kalender-/Listenrequests (keine `x-user-role`-Headers mehr)

## 10.4 Middleware- und Startup-Fluss

### 10.4.1 Request-Middleware (API)

In `server/routes.ts` ist die Reihenfolge:

1. `attachRequestUserContext`
2. `resolveUserRole`
3. bestehende API-Route-Module

Damit ist `req.userContext` vor jedem API-Handler verfügbar.

### 10.4.2 Startup-Guard

`assertConfiguredSystemUser()` wird vor Route-Registrierung ausgeführt und blockiert den Serverstart, wenn:

- `SETTINGS_USER_ID` fehlt oder ungueltig ist
- User nicht existiert
- User inaktiv ist
- User nicht `ADMIN` ist

## 10.5 Rollenmodell

DB-Rollen:

- `READER`
- `DISPATCHER`
- `ADMIN`

Kanonische Rollenkeys im Request-Kontext:

- `LESER`
- `DISPONENT`
- `ADMIN`

Mapping erfolgt zentral über `mapDbRoleCodeToCanonicalRole(...)`.

## 10.6 Lock-Autorisierung im Terminbereich

Sperrregel:

- Termin gesperrt + `roleKey !== ADMIN` -> Blockierung

Betroffene Mutationspfade:

- `PATCH /api/appointments/:id`
- `DELETE /api/appointments/:id`

Fehlerformat:

- HTTP `403`
- JSON mit `field: "APPOINTMENT_LOCKED"`

## 10.7 Entfernte Header-Abhaengigkeiten

`x-user-role` wurde als Rollenquelle vollständig entfernt:

- keine Auswertung im Backend-Controller
- keine Setzung in Client-Fetches

Rollenentscheidungen laufen ausschließlich über `req.userContext.roleKey`.

## 10.8 Benutzer-/Rollenverwaltung

Neue Endpunkte:

- `GET /api/users`
- `PATCH /api/users/:id` mit `{ roleCode }`

Regeln:

- nur `ADMIN` darf Rollen wechseln
- letzter `ADMIN` darf nicht verloren gehen
- Self-Demotion des letzten `ADMIN` ist blockiert

UI:

- neuer Screen `UsersPage`
- genau ein zusätzlicher Sidebar-Eintrag `Benutzerverwaltung`

## 10.9 Verifikation von FT (14)

Technisch geprüft:

- `npm run check`
- `npm run build`

Manuelle Prüfpunkte:

1. Server startet nur mit gültigem `SETTINGS_USER_ID` auf aktivem ADMIN-User.
2. `GET /api/users` als Nicht-ADMIN -> `403`.
3. Rollenwechsel als ADMIN funktioniert.
4. Demotion des letzten ADMIN wird blockiert.
5. Gesperrter Termin:
   - ADMIN darf ändern/löschen
   - Nicht-ADMIN erhält `403` mit `APPOINTMENT_LOCKED`.

---

# 9. FT (19) Attachments für Customer/Employee - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die technische Umsetzung von FT (19) vollständig und operativ. Fokus ist die reproduzierbare Umsetzung über alle Schichten hinweg mit klarer Semantik für Download und Delete.

## 8.1 Zielbild von FT (19)

FT (19) erweitert die bestehende Projekt-Attachment-Funktion auf:

- Customer-Attachments
- Employee-Attachments

Dabei wurden drei technische und fachliche Leitentscheidungen umgesetzt:

1. Attachments bleiben domaingebundene Datensätze (kein polymorphes Modell).
2. Download-Logik ist zentralisiert und domänenübergreifend konsistent.
3. Delete ist systemweit deaktiviert (UI und API).

## 8.2 Relevante Dateien (Backend)

### 8.2.1 Shared Schema und Contract

- `shared/schema.ts`
  - neue Tabellen `customer_attachment`, `employee_attachment`
  - neue Typen/Insert-Schemas für Customer/Employee Attachments
- `shared/routes.ts`
  - neuer Contract-Bereich `customerAttachments`
  - neuer Contract-Bereich `employeeAttachments`
  - Anpassung `projectAttachments.delete` auf Blockierungssemantik

### 8.2.2 Route/Controller/Service/Repository

- `server/routes/customerAttachmentsRoutes.ts`
- `server/controllers/customerAttachmentsController.ts`
- `server/services/customerAttachmentsService.ts`
- `server/repositories/customersRepository.ts`

- `server/routes/employeeAttachmentsRoutes.ts`
- `server/controllers/employeeAttachmentsController.ts`
- `server/services/employeeAttachmentsService.ts`
- `server/repositories/employeesRepository.ts`

- bestehend, angepasst:
  - `server/routes/projectAttachmentsRoutes.ts`
  - `server/controllers/projectAttachmentsController.ts`
  - `server/services/projectAttachmentsService.ts`
  - `server/repositories/projectsRepository.ts`

- zentrale Registrierung:
  - `server/routes.ts`

### 8.2.3 Gemeinsame Libs

- `server/lib/attachmentFiles.ts`
  - Upload-Limits und Dateiverarbeitung
  - Sanitization, MIME-Ableitung, persistenter Dateiname
- `server/lib/attachmentDownload.ts`
  - zentrale Header-/Disposition-/Streaming-Logik

## 8.3 Relevante Dateien (Frontend)

- `client/src/components/AttachmentsPanel.tsx` (generisches Panel)
- `client/src/components/ProjectAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/CustomerAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/EmployeeAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/ui/attachment-info-badge.tsx` (no-remove bei fehlendem Handler)
- `client/src/components/CustomerData.tsx` (Integration)
- `client/src/components/EmployeesPage.tsx` (Integration)

## 8.4 Persistenzmodell im Detail

### 8.4.1 Tabellenstruktur

Neue Tabellen sind strukturgleich zu `project_attachment`:

- `id`
- Parent-FK (`customer_id` / `employee_id`)
- `filename`
- `original_name`
- `mime_type`
- `file_size`
- `storage_path`
- `created_at`

### 8.4.2 Constraints und Indizes

Pro Tabelle:

- PK auf `id`
- FK-Index auf Parent-ID
- FK mit `ON DELETE CASCADE`

Damit sind Parent-bezogene Listenabfragen effizient und Parent-Löschung konsistent.

### 8.4.3 Migration

- SQL-Datei: `migrations/2026-02-07_ft19_customer_employee_attachments.sql`

Enthält:

- `CREATE TABLE customer_attachment`
- `CREATE TABLE employee_attachment`
- jeweils FK-Constraint + Key auf Parent-ID

## 8.5 API-Semantik und Endpunkte

### 8.5.1 Customer

- `GET /api/customers/:customerId/attachments`
- `POST /api/customers/:customerId/attachments`
- `GET /api/customer-attachments/:id/download`

Kein Delete-Endpunkt.

### 8.5.2 Employee

- `GET /api/employees/:employeeId/attachments`
- `POST /api/employees/:employeeId/attachments`
- `GET /api/employee-attachments/:id/download`

Kein Delete-Endpunkt.

### 8.5.3 Project

- `GET /api/projects/:projectId/attachments`
- `POST /api/projects/:projectId/attachments`
- `GET /api/project-attachments/:id/download`
- `DELETE /api/project-attachments/:id` ist absichtlich blockiert (`405`)

Blockierungsantwort:

- Status: `405`
- Body: `{ "message": "Attachment deletion is disabled" }`

## 8.6 Upload-Implementierungsdetails

Uploads laufen in allen drei Domänen identisch:

- Multipart Parser: `parseMultipartFile`
- Feldname: `file`
- Größenlimit: `10 MB`
- Originalname wird sanitiziert
- persistenter Dateiname wird zufallsbasiert generiert
- Datei wird in `server/uploads` geschrieben
- Metadaten werden in der jeweiligen Domain-Tabelle persistiert

Fehlerfall bei zu großer Datei:

- Status `413`
- klare Fehlermeldung im Controller

## 8.7 Download-Implementierungsdetails

Die Controller selbst enthalten keine individuelle Headerlogik mehr. Sie:

1. parsen die Attachment-ID,
2. laden den Datensatz aus passendem Service/Repository,
3. delegieren an `sendAttachmentDownload(...)`.

Die zentrale Funktion setzt:

- `Content-Type` auf ermittelten MIME-Typ (Fallback: octet-stream),
- `Content-Disposition` anhand der Disposition-Regel,
- Dateiauslieferung per `res.sendFile(...)`.

Disposition-Regel:

- `inline` für PDF und Images,
- sonst `attachment`,
- `?download=1` erzwingt `attachment`.

## 8.8 Delete-Deaktivierung: technische Umsetzung

Delete wird nicht nur in der UI entfernt, sondern serverseitig verhindert:

- Customer/Employee: kein Delete-Contract, keine Delete-Route, keine Delete-Controllerfunktion.
- Project: Delete-Route bleibt erreichbar, antwortet aber deterministisch mit Blockierung (`405`, feste Message).

Damit ist der Schutz robust gegen direkte API-Aufrufe.

## 8.9 Frontend-Pattern und Wrapper-Struktur

### 8.9.1 Generisches Panel

`AttachmentsPanel` ist rein strukturell und kennt keine Domain-API. Es rendert:

- Header + Add-Action
- Loading-/Empty-/List-State
- Item-Liste über `AttachmentInfoBadge`

Props enthalten ausschließlich Daten und Callback-Schnittstellen, u. a.:

- `items`
- `isLoading`
- `canUpload`
- `isUploading`
- `onUpload(file)`
- `buildOpenUrl(id)`
- `buildDownloadUrl(id)`

### 8.9.2 Domain-Wrapper

Jeder Wrapper kapselt:

- Domain-spezifischen Query-Key
- Domain-spezifischen Upload-Endpunkt
- Invalidation nach Upload
- URL-Building für Open/Download

Keine Wrapper-Variante rendert eine Delete-Aktion.

## 8.10 React Query und Invalidation

Verwendete Keys:

- Projekt: `["/api/projects", projectId, "attachments"]`
- Customer: `["/api/customers", customerId, "attachments"]`
- Employee: `["/api/employees", employeeId, "attachments"]`

Nach erfolgreichem Upload invalidiert jeder Wrapper exakt den eigenen Key.

Es gibt keine lokalen Schattenzustände für Attachment-Listen.

## 8.11 UI-Verhalten und Zustände

Alle drei Domains zeigen dieselben Zustände:

- Laden
- leer
- Liste mit Badges

Pro Badge sind zwei Aktionen über Preview verfügbar:

- Öffnen (normale Download-Route)
- Download (Route mit `download=1`)

Eine Remove-/Delete-Schaltfläche wird nicht angezeigt.

## 8.12 Betriebs- und Debug-Hinweise

### 8.12.1 Wenn Upload fehlschlägt

Prüfreihenfolge:

1. Multipart Header/Boundary vorhanden
2. Feldname wirklich `file`
3. Dateigröße <= 10 MB
4. Schreibrechte auf `server/uploads`
5. DB-Insert in Domain-Tabelle erfolgreich

### 8.12.2 Wenn Download fehlschlägt

Prüfreihenfolge:

1. Attachment-ID valide geparsed
2. Datensatz in passender Tabelle vorhanden
3. `storage_path` zeigt auf existente Datei
4. zentraler Download-Pfad setzt Header korrekt

### 8.12.3 Wenn „Delete“ dennoch versucht wird

Erwartetes Verhalten:

- Projekt-Delete liefert `405` + `"Attachment deletion is disabled"`
- Customer/Employee haben keinen Delete-Endpunkt

Abweichungen davon gelten als Regression.

## 8.13 Verifikation von FT (19)

Technisch geprüft:

- `npm run check`
- `npm run build`

Empfohlene manuelle Prüfpunkte:

1. Upload in Projekt, Customer und Employee jeweils erfolgreich.
2. Open/Inline-Verhalten für PDF/Bild in allen drei Domains gleich.
3. Download mit `?download=1` liefert Attachment-Disposition.
4. Delete-UI ist nirgends sichtbar.
5. Direktaufruf `DELETE /api/project-attachments/:id` liefert Blockierungsantwort.

## 8.14 Follow-up nach FT (19)

Mögliche Folgearbeiten außerhalb des aktuellen Scopes:

- optionales Audit-Logging für Downloads,
- Retention-/Cleanup-Strategie für physische Dateien,
- ggf. künftiges Re-Enable von Delete mit expliziter Fachentscheidung und Datenhygienekonzept,
- feinere Rechteprüfung pro Attachment-Domäne.



---

# 10. FT (20) Demo Seed/Purge - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die konkrete Umsetzung fuer Demo-Seeding mit Seed-Run-Tracking, Sauna-CSV-Kopplung, Template-Rendering und idempotentem Purge.

## 9.1 Zielbild von FT (20)

FT (20) liefert einen isolierten Admin-Use-Case fuer:

- reproduzierbare Demo-Daten
- nachvollziehbare Seed-Runs
- vollstaendige physische Loeschung inkl. Dateien

Regulaere Fachlogik wird nicht ersetzt. Seed/Purge bleibt ein separater technischer Pfad.

## 9.2 Relevante Dateien (Backend)

### 9.2.1 Contract und Schema

- `shared/routes.ts`
  - Contract-Bereich `api.demoSeed.*`
- `shared/schema.ts`
  - `seed_run`
  - `seed_run_entity`

### 9.2.2 Route/Controller/Service/Repository

- `server/routes/demoSeedRoutes.ts`
- `server/controllers/demoSeedController.ts`
- `server/services/demoSeedService.ts`
- `server/repositories/demoSeedRepository.ts`

### 9.2.3 Seed-Helfer

- `server/services/demoDataFiller.ts` (Faker-basiertes Stammdaten-Filling)
- `server/seed/csvLoader.ts` (Sauna-CSV Loader)
- `server/seed/types.ts`
- `server/lib/templateRender.ts`

## 9.3 Relevante Dateien (Frontend)

- `client/src/components/DemoDataPage.tsx`
- `client/src/pages/Home.tsx` (Einbindung)

Die Seite steuert Seed-Konfiguration, zeigt Summary/Warnings und listet vorhandene Seed-Runs fuer Purge.

## 9.4 Migration und DB-Rollout

Seed-Tracking wird ueber dedizierte SQL-Migration ausgerollt:

- `migrations/2026-02-07_demo_seed_runs.sql`

Die Migration ist idempotent (`CREATE TABLE IF NOT EXISTS`), damit wiederholte Ausfuehrungen stabil sind.

Hinweis fuer Betrieb: Fuer diesen Scope keine globale `db:push`-Pflicht, sondern gezielter Rollout der Seed-Migration.

## 9.5 Seederzeugung im Detail

### 9.5.1 Determinismus

Der Seeder nutzt einen Seed je Seed-Run:

- explizit ueber `randomSeed` oder
- abgeleitet aus `seedRunId`

Damit sind Datenverteilungen reproduzierbar.

### 9.5.2 Stammdaten

Mitarbeiter und Kunden werden mit Faker (DE) erzeugt. E-Mail-Schemata sind indexbasiert, damit Unique-Kollisionen im Demo-Kontext vermieden werden.

### 9.5.3 Sauna-CSV und Projektaufbau

Pro gewaehltem Sauna-Modell wird ein Projekt erstellt. CSV-Quelle:

- primaer `.ai/Demodaten`
- fallback `.ai/demodata`

Pflichtdatei:

- `fasssauna_modelle.csv`

Optionale Dateien:

- `fasssauna_ofenmodelle.csv`
- `fasssauna_modelle_ofen_mapping.csv`

Wenn optionale Dateien fehlen, bleibt Seed lauffaehig und meldet Warnungen im Summary.

### 9.5.4 Termine

Montage:

- genau ein projektgebundener Termin pro Projekt
- deterministisch im Fenster `seedWindowDaysMin..seedWindowDaysMax`

Rekla:

- optional zusaetzlich, ebenfalls projektgebunden
- Delay nach Montage: `reklDelayDaysMin..reklDelayDaysMax`
- gleiche Tour wie Montage
- Ofenkonsistenz ueber denselben Seed-Kontext

Mitarbeiterzuweisung wird im Seeder kollisionsfrei pro Kalendertag verwaltet.

## 9.6 Template-Settings

Verwendete Keys:

- `templates.project.title`
- `templates.project.description`
- `templates.appointment.mount.title`
- `templates.appointment.intraday.rekl.title`

Aufloesung erfolgt ueber `userSettingsService.getResolvedSettingsForUser(...)`.

Fallback:

- Bei nicht aufloesbaren User-Settings greifen feste Defaults im Seeder.

`templateRender` setzt Platzhalter auf Basis Whitelist um und entfernt leere Bullet-Zeilen deterministisch.

## 9.7 Seed-Run Mapping und Purge

Alle erzeugten IDs werden in `seed_run_entity` erfasst. Verwendete Entitaetstypen umfassen u. a.:

- `employee`
- `customer`
- `project`
- `appointment_mount`
- `appointment_rekl`
- `project_attachment`
- `team`
- `tour`

Purge arbeitet in FK-sicherer Reihenfolge und entfernt danach Mapping + `seed_run`.

Purge ist idempotent:

- erster Aufruf loescht Daten
- zweiter Aufruf liefert `noOp: true`

## 9.8 Attachments im Seed

Projektanhaenge werden ueber den bestehenden Attachment-Service erzeugt. Dabei werden:

- DB-Metadaten persistiert
- Dateien im Storage abgelegt
- IDs im Seed-Run-Mapping registriert

Beim Purge werden zuerst Dateien (mit ENOENT-Toleranz), danach zugehoerige DB-Records geloescht.

## 9.9 API-Vertrag und Responses

### 9.9.1 Create

`POST /api/admin/demo-seed-runs` liefert:

- `seedRunId`
- `createdAt`
- `requested`
- `created`
- `reductions`
- `warnings`

### 9.9.2 List

`GET /api/admin/demo-seed-runs` liefert historische Runs inkl. gespeicherter Summary.

### 9.9.3 Purge

`DELETE /api/admin/demo-seed-runs/:seedRunId` liefert:

- geloeschte Counts je Entitaetsgruppe
- `noOp` fuer idempotente Wiederholung

## 9.10 Verifikation und Scripts

Neue Scripts:

- `script/test-template-render.ts`
- `script/verify-demo-seed.ts`

NPM-Kommandos:

- `npm run test:template-render`
- `npm run verify:demo-seed`

Zusammen mit `npm run check` bilden sie den technischen Minimalnachweis fuer FT (20).

## 9.11 Bekannte Betriebsnotizen

- Bei bestimmten DB-Setups kann mysql2 eine Warnung zu `ssl-mode` ausgeben; das beeinflusst die erfolgreiche Seed/Purge-Ausfuehrung nicht.
- Seed-Runs sind absichtlich additiv. Bereinigung erfolgt explizit ueber Purge-Endpunkt oder Verifikationsscript.
