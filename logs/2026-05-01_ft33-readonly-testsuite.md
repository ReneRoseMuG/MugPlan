# FT-33 Readonly Testsuite

## Datum
01.05.26

## Anlass
Absicherung des FT-33-Readonly-Eingriffs mit einer echten Testsuite für zwei Terminsituationen:
- regulärer Termin mit Projekt, Kunde und `Tour 1`
- Abwesenheitstermin mit einzig verbleibendem FT-33-Mutationspfad im Mitarbeiterformular

## Umsetzung
- [tests/integration/server/employeeAppointmentAbsences.integration.test.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/integration/server/employeeAppointmentAbsences.integration.test.ts>) erweitert
  - reguläre generische Mutationen bleiben serverseitig möglich: `update`, `note create`, `remove employee`, `cancel`, `park`, `delete`
  - Abwesenheiten blocken dieselben generischen Pfade serverseitig mit `ABSENCE_APPOINTMENT_READONLY`
- neue Browser-Suite [tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts>) angelegt
  - regulärer Termin öffnet und bleibt mutierbar über Terminliste, Wochenkalender, Monatskalender und Monitoring
  - Abwesenheit öffnet außerhalb des Mitarbeiterformulars nicht mehr generisch
  - in der Monatsansicht sind die generischen Aktionsmenüs für Abwesenheiten unsichtbar
  - der FT-33-Pfad im Mitarbeiterformular weist echtes Edit und Delete mit persistiertem Nachweis nach
- [tests/helpers/testIsolationRegistry.ts](</C:/Users/schro/source/repos/Plan/Releases/version02/tests/helpers/testIsolationRegistry.ts>) um die neue Browser-Suite ergänzt
  - Baseline auf `core`, System-Seed wird in der Suite gezielt nachgezogen

## Rollenbezug
- geprüft wird der mutierende Pfad mit `ADMIN`
- fachliche Regel bleibt unverändert:
  - reguläre Termine bleiben für berechtigte Rollen über generische Pfade bearbeitbar
  - Abwesenheiten bleiben außerhalb des Mitarbeiterformulars readonly
  - der dedizierte FT-33-Pfad im Mitarbeiterformular bleibt aktiv

## Testlauf
- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test -c playwright.config.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`

## Ergebnis
- alle gezielten Läufe grün
- keine weitere Produktivcode-Änderung am FT-33-Readonly-Verhalten nötig

## Dokumentation
- Journal-Eintrag in Notion ergänzt
