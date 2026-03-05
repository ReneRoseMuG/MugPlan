# Log: Migration-Status Customer-Appointment

Datum: 2026-03-05
Branch: implement/customer-appointment

## Zweck
Prüfung, ob alle erforderlichen Migrationen für die aktuellen Termin-Erweiterungen in den Umgebungen `_dev` und `_test` bereits ausgeführt sind.

## Scope
- Verifikation des Migrationsstands über `__drizzle_migrations`
- Verifikation der Schema-Auswirkungen aus `migrations/0003_appointment_customer_display_mode.sql`
  - `appointments.customer_id`
  - `appointments.display_mode`
  - Index `idx_appt_customer_start_time_id`

## Technische Entscheidungen
- Keine Annahme über „automatische Migration beim Start“, da im Projekt kein `db:migrate`-Script konfiguriert ist.
- Statusprüfung direkt gegen die Ziel-DBs über `MYSQL_DATABASE_URL` aus `../../shared/.env.dev` und `../../shared/.env.test`.
- Hash-Abgleich der Migrationen zur eindeutigen Zuordnung:
  - `0000`: `3ee26816...`
  - `0001`: `c364635f...`
  - `0002`: `ca685863...`
  - `0003`: `cfd81027...`

## Ergebnis
### Entwicklung (`mugplan_dev`)
- `__drizzle_migrations` vorhanden
- Ausgeführt: 3 Migrationen (`0000`, `0001`, `0002`)
- Nicht ausgeführt: `0003_appointment_customer_display_mode.sql`
- Schemaeffekte von `0003` fehlen:
  - `appointments.customer_id` fehlt
  - `appointments.display_mode` fehlt
  - Index `idx_appt_customer_start_time_id` fehlt

### Test (`mugplan_test`)
- `__drizzle_migrations` vorhanden
- Ausgeführt: 0 Migrationen
- `0003` nicht ausgeführt
- Schemaeffekte von `0003` fehlen analog zu Dev

## Betroffene Dateien
- `migrations/0003_appointment_customer_display_mode.sql` (geprüft)
- `migrations/0002_ft07_backup_caldav_persistence.sql` (Hash-Referenz)
- `migrations/0001_safe_silk_fever.sql` (Hash-Referenz)
- `migrations/0000_nice_bulldozer.sql` (Hash-Referenz)

## Hinweise zum Testen
- Nach Ausführung von `0003` erneut prüfen:
  - Eintrag in `__drizzle_migrations` mit Hash `cfd81027...`
  - Vorhandensein der beiden Spalten und des Indexes in `appointments`

## Bekannte Einschränkungen
- Es wurde in diesem Schritt nur geprüft und dokumentiert, keine Migration ausgeführt.
