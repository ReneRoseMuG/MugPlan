# Test Speed Refactor

## Zweck

Refaktorierung der langsamen Integration-, API-E2E- und Browser-E2E-Testinfrastruktur ohne Änderung der Produktionslogik oder der fachlichen Invarianten.

## Scope

- Vereinheitlichung des Vitest-Setups für Integration und API-E2E
- Einführung gemeinsamer Test-Harnesses für App-Start, Login und Browser-Reset
- Entfernung redundanter `resetDatabase()`-Aufrufe in den priorisierten Vitest-Suites
- Umstellung ausgewählter Browser-E2E-Suites auf suite-lokale Isolation
- Härtung einer fragilen FT02-Browser-Suite gegen instabile Picker-/Scope-Annahmen

## Technische Entscheidungen

- `tests/setup.integration.ts` setzt neben dem DB-Reset jetzt auch den Zustand der `testDataFactory` zentral zurück.
- `tests/helpers/apiTestHarness.ts` kapselt App-Bootstrap sowie Login für `test-admin` und beliebige Credentials.
- `tests/helpers/browserE2e.ts` kapselt suite-lokalen Browser-Reset und den Admin-Login.
- Die priorisierten Vitest-Dateien verwenden den gemeinsamen Harness statt lokaler `express`-/`registerRoutes`-/`request.agent`-Dubletten.
- Browser-Suites mit eigenständigen, eindeutig benannten Fixtures laufen seriell mit Reset pro Suite/Describe statt Reset pro Test.
- Die FT02-Browser-Suite verwendet für die Kundenauswahl jetzt die eindeutige Kundennummer und prüft neue Projekte in der expliziten Ansicht `Alle Projekte`.

## Betroffene Dateien

- `tests/setup.integration.ts`
- `tests/helpers/apiTestHarness.ts`
- `tests/helpers/browserE2e.ts`
- `tests/integration/server/ft01.full-uc-coverage.integration.test.ts`
- `tests/integration/server/ft02.full-uc-coverage.integration.test.ts`
- `tests/integration/server/ft04.full-uc-coverage.integration.test.ts`
- `tests/e2e/project-with-appointment.workflow.e2e.test.ts`
- `tests/e2e/project-appointments.sidebar-all.workflow.e2e.test.ts`
- `tests/e2e-browser/appointment-direct-relations.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-multiday-edit.browser.e2e.spec.ts`
- `tests/e2e-browser/project-sidebar-all-appointments.browser.e2e.spec.ts`
- `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `tests/e2e-browser/list-empty-states-and-filter-messages.browser.e2e.spec.ts`

## Testen

Ausgeführt am 10. März 2026:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Alle vier Läufe waren erfolgreich. In `test:e2e:browser` bleibt ein bereits im Bestand `skip` markierter Test in `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`.

## Bekannte Einschränkungen

- Der geplante fachliche Zuschnitt der großen `full-uc-coverage`-Integrationsdateien in kleinere Dateien wurde in diesem Schritt noch nicht umgesetzt.
- Die Browser-Suite wurde in den priorisierten Dateien beschleunigt; eine weitergehende Laufzeitoptimierung des restlichen Browser-Bestands ist weiterhin möglich.
