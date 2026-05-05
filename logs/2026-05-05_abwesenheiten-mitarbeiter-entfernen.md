# Abwesenheiten: Mitarbeiter aus Kollisions-Terminen entfernen

Datum: 05.05.26
Branch: `work`
Ausgangs-Commit: `c48059f1`

## Zweck

Dieses Log dokumentiert die fachliche Korrektur des Abwesenheits-Konfliktfalls. Wenn eine Abwesenheit für einen Mitarbeiter erfasst oder geändert wird und dieser Mitarbeiter im Zeitraum bereits regulären Terminen zugeordnet ist, dürfen diese Termine nicht auf den Parkplatz verschoben werden. Stattdessen wird nach ausdrücklicher Bestätigung nur der betroffene Mitarbeiter aus den kollidierenden Terminen entfernt.

## Scope

- Der dedizierte FT-33-Abwesenheitsflow meldet kollidierende reguläre Termine weiterhin vorab.
- Nach Bestätigung werden die Terminversionen geprüft.
- Bei gültiger Bestätigung wird die jeweilige `appointment_employee`-Zuordnung entfernt.
- Tour, Tags, Projekt, Kunde, Datum und sonstige Termindaten der regulären Termine bleiben unverändert.
- Der bestehende explizite Parkplatz-Workflow für Termine und blockierte Tour-Wochen bleibt unverändert.

## Rollen und Sperren

- Mutationen im Abwesenheitsflow bleiben auf `ADMIN` und `DISPONENT` beschränkt.
- `LESER` darf Abwesenheiten weiterhin lesen, aber nicht anlegen, bearbeiten oder löschen.
- Die Durchsetzung liegt serverseitig im Abwesenheiten-Service.
- Eine reine UI-Bestätigung ist nicht maßgeblich; der Server verlangt bestätigte Terminversionen.

## Technische Entscheidungen

- Der Fehlercode wurde von `ABSENCE_OVERLAP_REQUIRES_PARKING` auf `ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL` umgestellt.
- Das Contract-Feld heißt jetzt `confirmedEmployeeRemovalAppointments`.
- Die Konfliktliste in Fehlerantworten heißt jetzt `employeeRemovalConflicts`.
- `employeeAppointmentAbsencesService` nutzt nicht mehr `parkAppointmentTx`, sondern erhöht die Terminversion und löscht gezielt den betroffenen Mitarbeiter aus dem Termin.
- Nach dem Mitarbeiterentzug wird ein CalDAV-Upsert für die betroffenen Termine ausgelöst.

## Betroffene Dateien

- `server/services/employeeAppointmentAbsencesService.ts`
- `server/controllers/employeeAppointmentAbsencesController.ts`
- `shared/routes.ts`
- `client/src/components/EmployeeAppointmentAbsencesPanel.tsx`
- `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`
- FT-33-Feature- und Use-Case-Dokumentation

## Verifikation

Erfolgreich ausgeführt:

- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration --reporter=verbose tests/integration/server/employeeAppointmentAbsences.integration.test.ts`
  - Ergebnis: 1 Datei, 8 Tests bestanden
- `npm run check`
  - Ergebnis: bestanden

## Hinweise

- Der Arbeitsstand enthielt bereits viele vorgemerkte Wiki-Änderungen außerhalb dieser FT-33-Korrektur. Diese wurden nicht zurückgesetzt.
- Für diesen Auftrag gab es keine DB-Schemaänderung und keine Migration.
