# PKG-01 Testliste (ueberarbeitet)

## Ziel von PKG-01
PKG-01 sichert zwei Kerninvarianten ab:

1. Konflikt-Prioritaet: `BUSINESS_CONFLICT` hat Vorrang vor `VERSION_CONFLICT`.
2. Optimistic Locking: veraltete Versionen muessen deterministisch als `409 VERSION_CONFLICT` enden.

Alle Tests sind Unit-Tests mit Mocks (keine echte DB, keine Seiteneffekte).

## Abdeckungsuebersicht
- Datei `tests/unit/invariants/conflictPriority.test.ts`: 3 Tests
- Datei `tests/unit/invariants/optimisticLocking.test.ts`: 7 Tests
- Gesamt: 10 Tests

## Datei `tests/unit/invariants/conflictPriority.test.ts`

### 1) `returns 409 BUSINESS_CONFLICT when overlap exists`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Termin existiert (`getAppointmentTx` liefert Datensatz).
  - Projekt existiert (`getProjectTx` liefert Datensatz).
  - Mitarbeiter-Ueberschneidung liegt vor (`hasEmployeeDateOverlapTx -> true`).
- When:
  - `updateAppointment(...)` wird ausgefuehrt.
- Then:
  - Fehler mit `status = 409` und `code = BUSINESS_CONFLICT`.
- Kontext:
  - Dieser Test beweist die fachliche Regel "zeitlicher Konflikt der Mitarbeiter ist ein Business-Konflikt".

### 2) `does not execute version-update path when business conflict already happened`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Gleiche Vorbedingungen wie Test 1 (Overlap = true).
- When:
  - `updateAppointment(...)` laeuft.
- Then:
  - `updateAppointmentWithVersionTx` wurde nicht aufgerufen.
  - `replaceAppointmentEmployeesTx` wurde nicht aufgerufen.
- Kontext:
  - Damit ist klar: Sobald der Business-Konflikt festgestellt wird, endet der Flow sofort.
  - Ein moeglicher Versionskonflikt wird gar nicht mehr ausgewertet.

### 3) `surfaces deterministic appointment error type and code for conflict-priority case`
- Service/Funktion: `appointmentsService.updateAppointment`, `isAppointmentError`
- Given:
  - Overlap weiterhin aktiv.
  - Mock fuer Version-Konflikt ist vorbereitet, um "gleichzeitige Konfliktlage" zu simulieren.
- When:
  - `updateAppointment(...)` wird aufgerufen.
- Then:
  - Fehler wird von `isAppointmentError` als Appointment-Fehler erkannt.
  - Fehlercode bleibt `BUSINESS_CONFLICT`.
  - `updateAppointmentWithVersionTx` bleibt unaufgerufen.
- Kontext:
  - Dieser Test sichert den deterministischen Fehlercode und verhindert Regressionen bei Refactorings.

## Datei `tests/unit/invariants/optimisticLocking.test.ts`

### 4) `appointment update succeeds with matching version`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Termin, Projekt vorhanden.
  - Kein Overlap.
  - Repository meldet `updated`.
- When:
  - Update mit korrekter Version.
- Then:
  - Erfolg mit Rueckgabe des aktualisierten Termins.
  - `updateAppointmentWithVersionTx` wurde genau einmal aufgerufen.
- Kontext:
  - Baseline-Test: Das Locking darf gueltige Aenderungen nicht blockieren.

### 5) `appointment update returns 409 VERSION_CONFLICT for stale version`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Termin und Projekt vorhanden, kein Overlap.
  - Repository meldet `version_conflict`.
- When:
  - Update mit veralteter Version.
- Then:
  - Fehler `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Kernszenario fuer konkurrierende Schreibzugriffe auf Termine.

### 6) `appointment delete returns 409 VERSION_CONFLICT for wrong version`
- Service/Funktion: `appointmentsService.deleteAppointment`
- Given:
  - Termin vorhanden.
  - Delete im Repository meldet `version_conflict`.
- When:
  - Delete mit falscher Version.
- Then:
  - Appointment-Fehler mit `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Optimistic Locking muss fuer Delete identisch robust sein wie fuer Update.

### 7) `project update returns 409 VERSION_CONFLICT when repository reports version_conflict`
- Service/Funktion: `projectsService.updateProject`
- Given:
  - Repository gibt `version_conflict` zurueck, Projekt existiert weiterhin.
- When:
  - Projekt-Update wird aufgerufen.
- Then:
  - Fehler `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Prueft, dass die Locking-Regel service-uebergreifend konsistent umgesetzt ist.

### 8) `project delete returns 409 VERSION_CONFLICT when repository reports version_conflict`
- Service/Funktion: `projectsService.deleteProject`
- Given:
  - Repository liefert `version_conflict`, Projekt existiert.
- When:
  - Delete wird aufgerufen.
- Then:
  - Fehler `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Delete-Variante der gleichen Regel fuer Projekte.

### 9) `note update returns 409 VERSION_CONFLICT when repository reports version_conflict`
- Service/Funktion: `notesService.updateNote`
- Given:
  - Repository liefert `version_conflict`, Notiz existiert.
- When:
  - Update mit veralteter Version.
- Then:
  - Fehler `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Schuetzt Notiz-Bearbeitung gegen Lost-Update.

### 10) `note delete returns 409 VERSION_CONFLICT when repository reports version_conflict`
- Service/Funktion: `notesService.deleteNote`
- Given:
  - Repository liefert `version_conflict`, Notiz existiert.
- When:
  - Delete mit falscher Version.
- Then:
  - Fehler `status = 409`, `code = VERSION_CONFLICT`.
- Kontext:
  - Ergaenzt die Notiz-Matrix vollstaendig (Update + Delete).

## Warum diese Tests wichtig sind
- Sie sichern fachlich kritische Integritaetsregeln.
- Sie verhindern nicht-deterministische Fehlercodes.
- Sie bilden die Grundlage fuer spaetere Integrationspakete (PKG-06/PKG-07).
