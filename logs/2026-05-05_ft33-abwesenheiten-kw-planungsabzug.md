# Auftragslog: FT-33 Abwesenheiten und Tour-KW-Planungsabzug

Datum: 05.05.26
Branch: `work`

## Zweck

Dieses Log dokumentiert die Ergänzung des Abwesenheitsflows um Tour-KW-Planungen. Wenn eine Abwesenheit für einen Mitarbeiter angelegt oder bearbeitet wird und dieser Mitarbeiter in einer vom Abwesenheitszeitraum betroffenen Tour-KW-Planung eingetragen ist, darf der Mitarbeiter dort nicht parallel stehen bleiben. Das System fordert deshalb eine ausdrückliche Bestätigung an und entfernt nach Bestätigung nur die betroffene Tour-KW-Mitarbeiterzuordnung.

## Scope

- Der bestehende FT-33-Abwesenheitsflow prüft weiterhin reguläre Terminüberschneidungen.
- Zusätzlich werden die vom Abwesenheitszeitraum betroffenen ISO-KWs ermittelt.
- Tour-KW-Zuordnungen des Mitarbeiters in diesen KWs werden als Konflikte an die UI zurückgegeben.
- Nach Bestätigung werden bestätigte Termin-Mitarbeiterzuordnungen und bestätigte Tour-KW-Mitarbeiterzuordnungen entfernt.
- Termine bleiben in ihrer bisherigen Tour und werden nicht auf den Parkplatz verschoben.
- Ohne Bestätigung bleiben Abwesenheit, Termine und Tour-KW-Planungen unverändert.

## Rollen und Sperren

- Mutationen im Abwesenheitsflow bleiben auf `ADMIN` und `DISPONENT` beschränkt.
- `LESER` darf Abwesenheiten lesen, aber nicht anlegen, bearbeiten oder löschen.
- Die Durchsetzung liegt serverseitig im Abwesenheiten-Service.
- Der Bestätigungsdialog ist nur Bedienlogik; der Server prüft bestätigte Terminversionen und bestätigte KW-Zuordnungen erneut.
- Tour-KW-Sperren und historische Regeln werden nicht aufgeweicht.

## Technische Entscheidungen

- Der bestehende Konfliktcode `ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL` wird weiterverwendet.
- Das Contract-Feld `confirmedWeekPlanningRemovals` bestätigt Tour-KW-Entfernungen.
- Die Fehlerantwort enthält zusätzlich `weekPlanningRemovalConflicts`.
- Der bestehende Tour-KW-Remove-Endpunkt wird nicht direkt verwendet, weil dieser auch Termin-Mitarbeiter entfernen kann.
- Die KW-Entfernung nutzt einen schmalen internen Pfad über `tourWeekEmployeesRepository.deleteAssignmentTx`.
- Termin-Entfernungen und KW-Entfernungen laufen im bestehenden DB-Transaktionspfad.

## Betroffene Dateien

- `server/services/employeeAppointmentAbsencesService.ts`
- `server/controllers/employeeAppointmentAbsencesController.ts`
- `server/services/tourWeekEmployeesService.ts`
- `shared/routes.ts`
- `client/src/components/EmployeeAppointmentAbsencesPanel.tsx`
- `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`
- `tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts`
- `tests/helpers/testIsolationRegistry.ts`
- FT-33-Feature- und Use-Case-Dokumentation

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:integration -- tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`
  - Ergebnis: 1 Datei, 14 Tests bestanden
- `npm run test:e2e:browser -- tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts`
  - Ergebnis: 2 Browser-Tests bestanden

## Hinweise

- Keine DB-Schemaänderung und keine Migration.
- Die neuen sichtbaren Datumsangaben verwenden bestehende zentrale Anzeigehelfer; technische ISO-Datumswerte bleiben auf Testdaten, Query-Parameter und interne Schlüssel beschränkt.
