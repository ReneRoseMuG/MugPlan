# FT30 Mitarbeiterabwesenheiten

## Zweck

Isolierte Einfuehrung der Mitarbeiterabwesenheiten als eigene CRUD-faehige Domaene im Mitarbeiterkontext.

## Scope

- Neue Datenbankentitaet `employee_absence`
- Isolierte API-Endpunkte unter `/api/employees/:employeeId/absences`
- Serverseitige Validierung und Rechtepruefung fuer FT30
- UI-Einbindung im bestehenden Mitarbeiterformular
- FT30-spezifische Unit-, Integration- und Browser-E2E-Tests

Nicht im Scope:

- Appointment-Logik
- Tour-Vorbelegung
- Konfliktpruefungen bei Terminen
- Kalender-Aggregation
- Hinweise oder Nebenwirkungen im Terminformular

## Technische Entscheidungen

- Umsetzung strikt nach Contract-First ueber `shared/routes.ts`
- Neue Server-Schicht analog zum bestehenden Muster: Route -> Controller -> Service -> Repository
- Optimistic Locking fuer Update/Delete ueber `version`
- Datumsregeln serverseitig als Wahrheit:
  - `from >= heute`
  - `until >= from`
  - Aendern und Loeschen nur solange `from` noch nicht in der Vergangenheit liegt
- Rollenregel:
  - `ADMIN` und `DISPONENT` erlaubt
  - `READER` blockiert
- UI bleibt im bestehenden Mitarbeiterformular; keine neue Hauptnavigation
- Keine Aenderung an Appointment-Pfaden

## Betroffene Dateien

- `shared/schema.ts`
- `shared/routes.ts`
- `server/routes.ts`
- `server/routes/employeeAbsencesRoutes.ts`
- `server/controllers/employeeAbsencesController.ts`
- `server/services/employeeAbsencesService.ts`
- `server/repositories/employeeAbsencesRepository.ts`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeeAbsencesPanel.tsx`
- `migrations/0009_ft30_employee_absences.sql`
- `migrations/meta/0009_snapshot.json`
- `migrations/meta/_journal.json`
- `tests/helpers/testDataFactory.ts`
- `tests/unit/validation/employeeAbsences.dto.validation.ft30.test.ts`
- `tests/unit/services/employeeAbsencesService.ft30.test.ts`
- `tests/unit/ui/employeeAbsencesPanel.wiring.test.ts`
- `tests/unit/ui/employeeForm.absencesTab.wiring.test.ts`
- `tests/integration/server/employeeAbsences.ft30.integration.test.ts`
- `tests/e2e-browser/employee-absences.ft30.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgefuehrt:

- `npm run typecheck`
- `npm run db:migrate:test`
- `npm run db:migration-status:test`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run tests/unit/validation/employeeAbsences.dto.validation.ft30.test.ts tests/unit/services/employeeAbsencesService.ft30.test.ts tests/unit/ui/employeeAbsencesPanel.wiring.test.ts tests/unit/ui/employeeForm.absencesTab.wiring.test.ts`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run tests/integration/server/employeeAbsences.ft30.integration.test.ts`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test tests/e2e-browser/employee-absences.ft30.browser.e2e.spec.ts -c playwright.config.ts`

Nicht ausgefuehrt:

- voller Testlauf
- voller Audit

## Bekannte Einschraenkungen

- FT30 ist bewusst isoliert; es existiert aktuell keine fachliche Kopplung an Termine.
- Die neuen UI-Unit-Tests sind node-basierte Verdrahtungstests, keine DOM-Rendering-Tests, da im Projekt kein `jsdom` installiert ist.
- Migration und Tests wurden nur gegen die Testumgebung ausgefuehrt.
