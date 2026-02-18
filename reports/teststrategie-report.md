# Teststrategie Report (Ist-Zustand)

Stand: 18.02.2026

## 1. Test-Split

- Unit-Tests: **60** Dateien unter `tests/unit`
- Integration-Tests: **22** Dateien unter `tests/integration`
- Getrennte Skripte:
  - `package.json:27` (`test:unit`)
  - `package.json:28` (`test:integration`)

## 2. Vorhandene Unit-Tests (gruppiert)

- `tests/unit/ui`: 35
- `tests/unit/invariants`: 6
- `tests/unit/services`: 6
- `tests/unit/authorization`: 3
- `tests/unit/auth`: 2
- `tests/unit/validation`: 2
- `tests/unit/settings`: 2
- `tests/unit/lib`: 2
- `tests/unit/extraction`: 1
- `tests/unit/ft04`: 1

## 3. Vorhandene Integration-Tests (Dateien)

- `tests/integration/batch/batchRollback.test.ts`
- `tests/integration/bootstrap/ensureSystemRoles.test.ts`
- `tests/integration/extraction/documentTextExtractor.fixture.test.ts`
- `tests/integration/joins/joinReplaceAtomicity.test.ts`
- `tests/integration/server/appointments.employee-overlap.flow.integration.test.ts`
- `tests/integration/server/appointments.employee-overlap.integration.test.ts`
- `tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts`
- `tests/integration/server/appointments.historical-guards.integration.test.ts`
- `tests/integration/server/customers.visibility.by-role.test.ts`
- `tests/integration/server/documentExtraction.routes.test.ts`
- `tests/integration/server/employees.visibility.by-role.test.ts`
- `tests/integration/server/ft04.employee-tour-relationship.integration.test.ts`
- `tests/integration/server/ft04.multi-user.integration.test.ts`
- `tests/integration/server/ft04.role.integration.test.ts`
- `tests/integration/server/ft04.tour-management.integration.test.ts`
- `tests/integration/server/ft11.team-management.integration.test.ts`
- `tests/integration/server/projectAppointments.version.test.ts`
- `tests/integration/server/projects.delete.rules.test.ts`
- `tests/integration/server/projectStatus.lifecycle.test.ts`
- `tests/integration/server/projectStatus.relations.test.ts`
- `tests/integration/server/teamsTours.versioning.test.ts`
- `tests/integration/server/userSettings.weekLaneCollapse.persistence.test.ts`

## 4. Sauberer DB-Zustand bei Integrationstests

- In **21 von 22** Integrationstest-Dateien wird `beforeEach(async () => await resetDatabase())` genutzt (z. B. `tests/integration/server/ft04.role.integration.test.ts:41`).
- Ausnahme: `tests/integration/extraction/documentTextExtractor.fixture.test.ts` (arbeitet nur auf PDF-Fixture, ohne DB).
- `resetDatabase()` sichert Isolation über:
  - Guard nur im Testmodus: `tests/helpers/resetDatabase.ts:9`
  - Guard auf Test-DB (`mugplan_test`): `tests/helpers/resetDatabase.ts:13`
  - MySQL Named Lock gegen Parallel-Reset: `tests/helpers/resetDatabase.ts:24`
  - FK-Checks aus, alle Tabellen `TRUNCATE`, FK-Checks an: `tests/helpers/resetDatabase.ts:33`, `tests/helpers/resetDatabase.ts:41`, `tests/helpers/resetDatabase.ts:45`
  - Baseline danach wiederherstellen (`ensureSystemRoles`, Admin-User): `tests/helpers/resetDatabase.ts:54`, `tests/helpers/resetDatabase.ts:57`, `tests/helpers/resetDatabase.ts:64`
- Zusätzlich läuft Vitest seriell (`fileParallelism: false`, `concurrent: false`), was Race Conditions reduziert: `vitest.config.ts:18`, `vitest.config.ts:20`.

## 5. Setup-Verkabelung (aktuell)

- Für Integrationstests gibt es jetzt eine dedizierte Konfiguration `vitest.integration.config.ts`.
- Diese lädt explizit beide Setup-Dateien:
  - `tests/setup.env.ts`
  - `tests/setup.integration.ts`
- `package.json` nutzt dafür:
  - `test:integration`: `vitest run -c vitest.integration.config.ts tests/integration`
- Der DB-Reset läuft damit zentral über `tests/setup.integration.ts`; lokale `resetDatabase`-Aufrufe in Integrationstests sind entfernt.
