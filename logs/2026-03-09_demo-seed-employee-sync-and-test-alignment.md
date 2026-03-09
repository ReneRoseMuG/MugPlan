# Demo-Seed Mitarbeiter-Sync und Testanpassungen

## Zweck

Anpassung des Demo-Seed- und Reset-Verhaltens fuer Mitarbeitende sowie Nachziehen der betroffenen Tests auf den neuen Sollzustand.

## Scope

- Admin-Reset behaelt `users`, `roles`, `employee` und `employee_attachment` bei.
- Demo-Seed synchronisiert Mitarbeitende idempotent aus `../../shared/uploads/demodata/Personal.csv`.
- Das DemoData-Formular verlangt keine Mitarbeiter-Anzahl mehr.
- Betroffene Unit- und Integrationstests wurden auf den neuen Ablauf angepasst.
- Die Mitarbeiter-Entity-Card zeigt das Badge fuer geplante Termine ueber die volle Breite.

## Technische Entscheidungen

- Mitarbeitende werden im Base-Seed nicht mehr als purge-bare `seed_run_entity`-Eintraege behandelt.
- Appointments-Only-Seeds beziehen Mitarbeitende aus `summary.meta.employeeIds` des Basis-Runs.
- Der CSV-Import fuer Mitarbeitende laeuft still innerhalb des Demo-Seeds und ist idempotent.
- Testannahmen fuer Katalogdaten, Notizen und Base-Run-Referenzen wurden auf den aktuellen Seed-Stand angepasst.

## Betroffene Dateien

- `server/services/demoSeedService.ts`
- `server/services/employeesService.ts`
- `server/repositories/adminRepository.ts`
- `shared/routes.ts`
- `client/src/components/DemoDataPage.tsx`
- `client/src/components/EmployeesPage.tsx`
- `tests/unit/services/employees.importCsv.ft23.test.ts`
- `tests/integration/server/admin.reset.employee-preservation.integration.test.ts`
- `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/TEST_MATRIX.md`

## Verifikation

- `npm run test:run -- tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
- `npm run test:run -- tests/unit/services/employees.importCsv.ft23.test.ts tests/integration/server/admin.reset.employee-preservation.integration.test.ts tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`

Beide Laeufe waren erfolgreich.

## Hinweise

- Die Testdatei `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts` enthaelt weiterhin bestehende Mojibake-Spuren im Dateitext; die fachlichen Erwartungen wurden dennoch auf den realen Seed-Zustand nachgezogen.
