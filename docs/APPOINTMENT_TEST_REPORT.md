# Appointment Test Report

Stand: 2026-02-17  
Basis: aktueller Gruenlauf `npm run test:run`

## Scope
Dieser Report umfasst terminbezogene Tests in:
- Integration (API/Service/DB-Vertrag)
- Unit Invariants (Locking, Conflict, Versioning)
- Unit UI (Form, Kalender, Previews, Loeschen)

Hinweis:
- In `tests/unit/invariants/optimisticLocking.test.ts` sind 8 Tests enthalten, davon sind 3 direkt terminbezogen (die restlichen betreffen Projekt/Notiz-Versionierung).

## Abdeckungsuebersicht
- Terminbezogene Testdateien: 19
- Terminbezogene Testfaelle: 65 (davon 60 direkt Termine, 5 angrenzend ueber Projekt-Loeschregeln/Versionierung)
- Schwerpunkte:
  - Mitarbeiter-Overlap (einfach, mehrtaegig, Folgefluesse)
  - Historische Guards (Create/Update/Startzeit)
  - Optimistic Locking und Lock-Violations
  - API-Vertrag fuer Versionsfelder
  - UI-Wiring fuer Speichern/Loeschen/Relationen/Preview/Kalender

## Detailliste (Suite + Testfunktion)

### 1) `tests/integration/server/appointments.employee-overlap.integration.test.ts`
Suite: `FT01 integration: employee overlap base scenarios`
- `Case 1: tour prefill reports conflicting employee and keeps conflict-free tour members`
  - Prueft Konfliktmeldung fuer Tour-Prefill und dass nur konfliktfreie Mitarbeiter persistiert werden.
- `Case 2: team assignment reports conflicting employee and keeps conflict-free team members`
  - Prueft das gleiche Verhalten fuer Team-Zuweisung per Update.
- `Case 3: manual employee assignment reports conflict and does not persist blocked employee`
  - Prueft manuelle Konfliktfaelle inkl. Blockade und Join-Konsistenz.

### 2) `tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts`
Suite: `FT01 integration: employee overlap multiday scenarios`
- `multiday + tour: employee blocked when conflict exists on one day in span`
  - Konflikt an einem Tag blockiert Mitarbeiter fuer den gesamten Mehrtageszeitraum.
- `multiday + team: one-day conflict blocks employee for entire assignment`
  - Team-Variante der Mehrtagesregel.
- `multiday + manual assignment: conflicting employee is not partially assigned`
  - Keine partielle Persistierung bei manuellem Mehrtageskonflikt.

### 3) `tests/integration/server/appointments.employee-overlap.flow.integration.test.ts`
Suite: `FT01 integration: employee overlap follow-up flows`
- `keeps join operation conflict-safe across tour/team/manual sequence`
  - Prueft Sequenz aus Tour setzen/entfernen/wechseln + Team/manuell inkl. Duplikatfreiheit in `appointment_employee`.

### 4) `tests/integration/server/appointments.historical-guards.integration.test.ts`
Suite: `FT01 integration: historical appointment guards`
- `H5.1 blocks create for past date and keeps persistence unchanged`
  - API blockiert Create in Vergangenheit und schreibt nichts.
- `H5.2 blocks update for existing appointment in the past`
  - API blockiert Update auf historischem Termin.
- `H5.3 blocks today date with startTime in the past`
  - API blockiert `startDate=today` mit vergangener Startzeit.

### 5) `tests/integration/server/projectAppointments.version.test.ts`
Suite: `FT04 integration: project appointments version contract`
- `returns version on project appointment list items`
  - API-Liste liefert `version` fuer spaeteres optimistic locking.

### 6) `tests/integration/joins/joinReplaceAtomicity.test.ts`
Suite: `PKG-07 Integration: join replace atomicity`
- `keeps join relations unchanged when replacement contains invalid employee id`
  - Termin-Join-Replace ist atomar: bei Fehler keine Teilmutation.

### 7) `tests/integration/server/projects.delete.rules.test.ts` (terminangrenzend)
Suite: `FT02 integration: project delete rules`
- `returns 204 when deleting project without appointments`
  - Loeschen erlaubt, wenn keine Termine existieren.
- `returns 409 BUSINESS_CONFLICT when project has at least one appointment`
  - Loeschen verboten bei bestehenden Terminen.
- `returns 409 VERSION_CONFLICT when deleting with stale version`
  - Versionsschutz im Delete-Flow.
- `returns 404 NOT_FOUND for unknown project`
  - Definierter Fehler fuer unbekannte Projekt-ID.

### 8) `tests/unit/ui/appointmentForm.relationSlots.test.tsx`
Suite: `FT01 appointment form relation slot wiring`
- `uses project relation slot with lock-aware readonly state`
  - Projekt-Slot folgt Lock-Status korrekt.
- `keeps legacy project select test id`
  - Test-ID-Kompatibilitaet fuer bestehende Automation.
- `renders customer relation as readonly slot`
  - Kunde ist im Terminformular read-only abgeleitet.
- `renders project detail card inside project relation slot`
  - Projektdetails werden korrekt im Slot angezeigt.
- `loads projects with scope=all for stable post-selection rendering`
  - Datenquelle fuer Projektwahl ist korrekt verdrahtet.
- `shows tour selection badges only when no tour is selected`
  - Tour-UI-Zustand schaltet korrekt.

### 9) `tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx`
Suite: `FT01 appointment form save and employees panel wiring`
- `tracks appointment detail version for edit save`
  - Version wird aus Detaildaten fuer PATCH uebernommen.
- `blocks edit save when version is missing or invalid`
  - Kein Speichern ohne gueltige Version.
- `sends version in PATCH payload`
  - Payload-Vertrag fuer optimistic locking.
- `loads appointment detail always fresh in edit mode`
  - Edit-Form nutzt frische Datenquelle.
- `sends fresh version in DELETE payload and retries once on VERSION_CONFLICT`
  - Delete-Flow mit Retry bei Versionskonflikt.
- `maps delete errors by API code instead of raw status text`
  - User-Feedback basiert auf Fehlercode-Mapping.
- `renders employee picker as header action button with plus icon`
  - UI-Aktionspunkt fuer Mitarbeiterauswahl vorhanden.
- `removes legacy large employee selection button block`
  - Altes UI-Element ist entfernt.

### 10) `tests/unit/ui/appointmentForm.historical-validation.test.tsx`
Suite: `FT01 UI: appointment form historical validation`
- `blocks save when startDate is in the past`
  - Form-Validation blockiert vergangenes Datum.
- `blocks save when startTime on today is in the past`
  - Form-Validation blockiert vergangene Uhrzeit am heutigen Tag.
- `prevents persistence call when historical validation fails`
  - Kein Persist-Call bei Historienfehlern.

### 11) `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
Suite: `FT20 appointment form document extraction flow wiring`
- `calls extract endpoint with appointment_form scope`
  - Endpoint/Scope-Verdrahtung stimmt.
- `wires dropzone and extraction dialog`
  - Upload- und Dialogfluss verdrahtet.
- `wires apply callbacks and disable rules`
  - Apply-Regeln und Disable-Logik verdrahtet.

### 12) `tests/unit/ui/calendar.historical-create-controls.test.tsx`
Suite: `FT01 UI: calendar historical create controls`
- `guards month create button behind day >= berlinToday`
  - Monatsansicht blockiert historische Erstellung.
- `guards week create button behind day >= berlinToday`
  - Wochenansicht blockiert historische Erstellung.
- `guards year create button behind day >= berlinToday`
  - Jahresansicht blockiert historische Erstellung.
- `does not expose historical creation action in appointment table view`
  - Keine historische Erstellung ueber Tabellenansicht.

### 13) `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
Suite: `FT02 appointment preview order number wiring`
- `passes projectOrderNumber into weekly project panel`
  - Auftragsnummer wird in Weekly-Preview uebergeben.
- `renders order number line in weekly project panel`
  - Anzeigezeile fuer Auftragsnummer vorhanden.
- `wires order number into fallback appointment info preview`
  - Fallback-Preview traegt Auftragsnummer.

### 14) `tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx`
Suite: `FT03 weekly preview width resolution`
- `returns fallback width when no value is stored`
  - Fallback-Wert greift.
- `returns stored width when a valid value exists`
  - Persistierter Wert wird verwendet.
- `rejects invalid stored values`
  - Ungueltige Werte werden abgefangen.

### 15) `tests/unit/ui/projectAppointmentsPanel.deleteWiring.test.tsx`
Suite: `FT04 project appointments panel delete wiring`
- `sends delete payload with appointment version`
  - Delete nutzt Versionspayload korrekt.
- `maps VERSION_CONFLICT and LOCK_VIOLATION to explicit toasts`
  - Fehlercodes werden benutzerverstaendlich gemappt.

### 16) `tests/unit/ui/projectsTable.preview.test.tsx`
Suite: `FT03 projects table preview wiring`
- `uses createAppointmentWeeklyPanelPreview for relevant appointments`
  - Tabellen-Preview nutzt standardisierte Termin-Preview-Komponente.
- `keeps no-appointment fallback text`
  - Fallback-Text bei fehlenden Terminen.

### 17) `tests/unit/invariants/optimisticLocking.test.ts` (teilweise terminbezogen)
Suite: `PKG-01 Invariant: optimistic locking`
- `appointment update succeeds with matching version`
  - Positivpfad fuer PATCH-Versionierung.
- `appointment update returns 409 VERSION_CONFLICT for stale version`
  - Konfliktpfad fuer stale Version.
- `appointment delete returns 409 VERSION_CONFLICT for wrong version`
  - Konfliktpfad fuer Delete-Version.
- Weitere 5 Tests in derselben Suite pruefen analoge Invarianten fuer Projekt/Notiz.

### 18) `tests/unit/invariants/lockingRules.test.ts`
Suite: `PKG-02 Invariant: locking rules`
- `blocks update for non-admin on locked appointment with deterministic LOCK_VIOLATION`
  - Non-admin darf gesperrten Termin nicht aendern.
- `blocks delete for non-admin on locked appointment with deterministic LOCK_VIOLATION`
  - Non-admin darf gesperrten Termin nicht loeschen.
- `blocks admin update on locked appointment with BUSINESS_CONFLICT`
  - Historische Update-Blockade fuer Admin ist deterministisch.
- `allows admin delete on locked appointment`
  - Admin darf gesperrte/historische Termine loeschen.

### 19) `tests/unit/invariants/conflictPriority.test.ts`
Suite: `PKG-01 Invariant: conflict priority`
- `returns conflictEmployees metadata when overlap exists`
  - Konfliktmetadaten enthalten betroffene Mitarbeiter.
- `executes version-update path and persists only non-conflicting employees`
  - Nur konfliktfreie Mitarbeiter werden geschrieben.
- `still surfaces deterministic VERSION_CONFLICT if optimistic lock fails`
  - Versionierungsfehler bleibt priorisiert und deterministisch.

## Fazit zur Termin-Testabdeckung
Die Abdeckung ist breit und mehrschichtig:
- Fachregeln fuer Konflikte und Historie sind auf API- und UI-Ebene abgesichert.
- Kritische technische Invarianten (atomicity, locking, optimistic locking) sind separat getestet.
- Terminbezogene UI-Contracts (Form/Loeschen/Preview/Kalender) sind explizit verdrahtet.

Aktuelle erkennbare Luecke:
- Es gibt keinen dedizierten E2E-Test (Browser-Flow) fuer den kompletten Terminlebenszyklus; aktuell liegt der Fokus auf Integration + Unit.
