# FT-33 Readonly Testsuite

## Datum
01.05.26

## Anlass
Absicherung des FT-33-Readonly-Eingriffs mit einer echten Testsuite fuer zwei Terminsituationen:
- regulaerer Termin mit Projekt, Kunde und `Tour 1`
- Abwesenheitstermin mit einzig verbleibendem FT-33-Mutationspfad im Mitarbeiterformular

## Umsetzung
- [tests/integration/server/employeeAppointmentAbsences.integration.test.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/integration/server/employeeAppointmentAbsences.integration.test.ts>) erweitert
  - regulaere generische Mutationen bleiben serverseitig moeglich: `update`, `note create`, `remove employee`, `cancel`, `park`, `delete`
  - Abwesenheiten blocken dieselben generischen Pfade serverseitig mit `ABSENCE_APPOINTMENT_READONLY`
- neue Browser-Suite [tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts>) angelegt
  - regulaerer Termin oeffnet und bleibt mutierbar ueber Terminliste, Wochenkalender, Monatskalender und Monitoring
  - Abwesenheit oeffnet ausserhalb des Mitarbeiterformulars nicht mehr generisch
  - in der Monatsansicht sind die generischen Aktionsmenues fuer Abwesenheiten unsichtbar
  - der FT-33-Pfad im Mitarbeiterformular weist echtes Edit und Delete mit persistiertem Nachweis nach
- [tests/helpers/testIsolationRegistry.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/helpers/testIsolationRegistry.ts>) um die neue Browser-Suite ergaenzt
  - Baseline auf `core`, System-Seed wird in der Suite gezielt nachgezogen

## Rollenbezug
- geprueft wird der mutierende Pfad mit `ADMIN`
- fachliche Regel bleibt unveraendert:
  - regulaere Termine bleiben fuer berechtigte Rollen ueber generische Pfade bearbeitbar
  - Abwesenheiten bleiben ausserhalb des Mitarbeiterformulars readonly
  - der dedizierte FT-33-Pfad im Mitarbeiterformular bleibt aktiv

## Testlauf
- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test -c playwright.config.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`

## Ergebnis
- alle gezielten Laeufe gruen
- keine weitere Produktivcode-Aenderung am FT-33-Readonly-Verhalten noetig
