# Integration-Audit-Fix

## Zweck

Nach dem Audit ohne Coverage und dem anschließenden Integrationstestlauf schlugen zwei Integration-Suiten fehl. Ziel war, alle Ursachen zu beheben, die ohne Eingriff in Produktionscode lösbar sind.

## Scope

Umgesetzt wurden ausschließlich Änderungen an der Test-Infrastruktur:

- Der Integration-Test-Reset hält den Datenbank-Lock jetzt bis nach Spaltenprüfung, Rollen-/Stammdaten-Baseline und `test-admin`-Anlage.
- Duplicate-Entry-Fehler bei der Testadmin-Anlage werden auch erkannt, wenn MySQL-Fehler von Drizzle in `cause` gekapselt werden.
- `appointments.park.integration.test.ts` wurde in der Isolation-Registry als harte `seeded`-Suite registriert.
- `attachments.delete.ft19.integration.test.ts` wurde in der Isolation-Registry als Upload-Storage-Sonderfall registriert.

Nicht geändert wurde Produktionscode.

## Betroffene Dateien

- `tests/helpers/resetDatabase.ts`
- `tests/helpers/testIsolationRegistry.ts`

## Tests

Ausgeführt und erfolgreich:

- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/appointments.park.integration.test.ts tests/integration/server/attachments.delete.ft19.integration.test.ts`
- `npm run test:integration`

Ergebnis des vollständigen Integrationstestlaufs:

- 112 Testdateien bestanden.
- 612 Tests bestanden.
- 4 Tests übersprungen.

## Hinweise

`package-lock.json` war bereits durch die vorherige Installation fehlender Audit-Pakete geändert. Diese Änderung gehört zum vorbereitenden Audit-Tooling und wurde nicht durch den Test-Infrastruktur-Fix erzeugt.
