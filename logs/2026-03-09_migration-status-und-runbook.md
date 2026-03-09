# Migration Status und Runbook

## Zweck

Pruefung und Korrektur des Migrationsstands fuer `mugplan_dev` und `mugplan_test` sowie Einfuehrung eines festen operativen Pfads zum Pruefen und Ausfuehren von Repository-Migrationen.

## Scope

- Verifikation von `__drizzle_migrations` in Dev und Test
- Verifikation der benoetigten Schemaelemente fuer FT07, FT29 und die Appointment-Erweiterung
- Nachziehen des DB-Stands in `mugplan_dev` und `mugplan_test`
- Korrektur der Migrationsreihenfolge in `migrations/meta/_journal.json`
- Neue Scripts fuer Statuspruefung und Migrationslauf
- Kurze Doku fuer den operativen Einsatz

Nicht Teil des Scopes:

- Vollstaendige Rekonstruktion fehlender historischer Drizzle-Snapshots unter `migrations/meta`
- Produktions-Migrationslauf
- Voller Testlauf oder voller Audit

## Technische Entscheidungen

- Der operative Standardpfad liegt jetzt in npm-Skripten, damit Pruefung und Ausfuehrung nicht mehr recherchiert werden muessen.
- Die Statuspruefung vergleicht Repository-SQL-Dateien direkt ueber SHA-256 mit `__drizzle_migrations`.
- Der Migrationslauf nutzt weiter `drizzle-kit migrate`, wird aber von einem vorgelagerten Status- und Ziel-Check eingerahmt.
- Fuer `test` bleibt die bestehende Safety-Gate-Logik verpflichtend aktiv.

## Betroffene Dateien

- `script/migrationUtils.ts`
- `script/check-migration-status.ts`
- `script/run-migrations.ts`
- `package.json`
- `docs/implementation.md`
- `docs/MIGRATION_RUNBOOK.md`
- `migrations/meta/_journal.json`

## DB-Korrektur

- `mugplan_dev` auf Migrationsstand `0000` bis `0004` gebracht
- `mugplan_test` auf Migrationsstand `0000` bis `0004` gebracht
- Verifiziert:
  - `appointments.customer_id`
  - `appointments.display_mode`
  - `users.two_factor_secret_encrypted`
  - `users.two_factor_backup_codes_reserved`
  - Index `idx_appt_customer_start_time_id`

## Testen

Ausgefuehrt:

- `npm run db:migration-status:dev`
- `npm run db:migration-status:test`
- `npm run db:migrate:dev`

Ergebnis:

- `db:migration-status:dev`: erfolgreich, DB synchron
- `db:migration-status:test`: erfolgreich, DB synchron
- `db:migrate:dev`: erfolgreich, No-op bei bereits synchroner DB

Nicht ausgefuehrt:

- `db:migrate:test`: nach erfolgreicher direkter DB-Korrektur nicht erneut noetig
- `db:migration-status:prod` und `db:migrate:prod`: keine Produktionsaenderung in diesem Schritt

## Bekannte Einschraenkungen

- Unter `migrations/meta` fehlen weiterhin historische Snapshot-Dateien fuer spaetere Migrationen. Der operative Pfad zum Pruefen und Ausfuehren ist davon nicht blockiert, die Drizzle-Metahistorie bleibt aber technisch unvollstaendig.
