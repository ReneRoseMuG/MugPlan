# Test DB Safety Inventory

Ziel: Vollstaendiges Inventar aller Pfade mit destruktivem Potenzial und Nachweis der zentralen Guard-Nutzung.

## Statusdefinition
- `secured`: nutzt zentrale Guard-APIs und SQL-Identity-Check.
- `partial`: nutzt bereits Teile, aber nicht den vollstaendigen Standard.
- `open`: noch ohne zentrale Guard-Kette.

## Inventar

| Pfad | Trigger | Art | DB-Connect-Pfad | Soll-Guard-Entry | Status |
|---|---|---|---|---|---|
| `tests/helpers/resetDatabase.ts` | Integration setup | reset + truncate | `mysql.createConnection(...)` | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` | secured |
| `script/reset-test-db.ts` | manuell / script | reset + truncate | `mysql.createConnection(...)` | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` | secured |
| `server/controllers/adminController.ts` | API `/admin/reset-database` controller entry | destructive trigger (delegation) | delegiert an `adminService.resetDatabase` | indirekt via `adminService`-Guard-Kette | secured |
| `server/services/adminService.ts` | API `/admin/reset-database` | reset + delete | `mysql.createConnection(...)` + repos | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` | secured |
| `server/middleware/adminMaintenancePolicy.ts` | Admin middleware | destructive route gate | runtime config | `assertSafeDestructiveOperationTarget` | secured |
| `server/services/demoSeedService.ts` | API `DELETE /admin/demo-seed-runs/:seedRunId` | purge + delete | via `server/db.ts` + `demoSeedRepository` | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` (via `demoSeedPurgeSafety`) | secured |
| `server/repositories/demoSeedRepository.ts` | internal purge path | multi-table delete transaction | `db.transaction(...)` via `server/db.ts` | vorgelagertes zentrales destruct-gate inkl. SQL-Identity (Service-Gate) | secured |
| `tests/integration/bootstrap/ensureSystemRoles.test.ts` | Integration test | truncate roles | `mysql.createConnection(runtimeConfig...)` | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` | secured |
| `tests/integration/server/ft07.backup-and-caldav.integration.test.ts` | Integration test | `DELETE FROM backup_log` | via `db.execute` | `assertSafeDestructiveOperationTarget` + `assertSqlDatabaseIdentity` vor delete | secured |
| `script/sql/reset_safe_dev_test.sql` | manuell SQL | drop + recreate schema | SQL client | SQL guard block + Test-DB-Namensregel + Host/Port-Plausi | partial |
| `script/sql/reset_absolute_state.sql` | manuell SQL | drop + recreate schema | SQL client | SQL guard block (`SQLSTATE 45000`) + Test-DB-Namensregel (`*_test`) | secured |
| `script/sql/2026-03-11_recreate_server_schema_from_repo.sql` | manuell SQL | drop + recreate schema | SQL client | SQL guard block (`@expected_database` + `SQLSTATE 45000`) + aktive DB-Identitaetspruefung | partial |
| `script/seed-roles.ts` | script | seed writes | via `server/db.ts` | zentraler DB-Factory-Guard in `db.ts` | secured |
| `script/verify-demo-seed.ts` | script | seed + purge writes | via `server/db.ts` | zentraler DB-Factory-Guard in `db.ts` | secured |
| `script/migrate-project-names-with-customer-number.ts` | script | migration writes | via `server/db.ts` | zentraler DB-Factory-Guard in `db.ts` | secured |
| `script/run-migrations.ts` | manuell / `npm run db:migrate:*` | schema migration writes, inklusive optionalem `DROP TABLE` | `mysql.createConnection(...)` via `initializeMigrationRuntime()` | Runtime-Zielvalidierung ueber `initializeMigrationRuntime()`; kein zentrales Destructive-Guard-Gate wie bei Reset-Pfaden | partial |
| `server/services/dumpService.ts` | API `POST /api/admin/dumps/import` | TRUNCATE TABLE aller Dump-Tabellen + Insert | `pool.getConnection()` aus `server/db.ts` (startupvalidiert) | Admin-Session-Guard + `NODE_ENV !== "production"`-Guard; DB-Startup-Guard aus `db.ts` validiert Ziel-DB beim Serverstart | partial |

## Verbindliche Regeln fuer alle Eintraege
1. Kein Testmodus-Write ausserhalb erlaubter Test-DB.
2. Keine destruktive Aktion ohne zentrales Guard-Gate.
3. Keine unguardete eigene DB-Verbindung fuer destruktive Pfade.

## Nachweisfuehrung
- Guard-Evidenz erfolgt ueber:
  - Codepfad (`assert*` Aufruf),
  - Unit-Tests fuer Guardlogik,
  - Inventory-Audit-Script: `script/check-destructive-inventory.ts`,
  - Integrations-/Smoke-Checks fuer Hard-Fail bei unsicherem Ziel.
