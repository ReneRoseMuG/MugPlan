# Storage Paths

Die Env-Variablen `ATTACHMENT_STORAGE_PATH` und `BACKUP_BASE_PATH` unterstuetzen absolute und relative Werte in allen Modi (`development`, `test`, `production`).

Regeln:

- Absolute Pfade werden unveraendert verwendet.
- Relative Pfade werden immer gegen `process.cwd()` aufgeloest (Working Directory des gestarteten Server-Prozesses).
- Beide Zielverzeichnisse werden beim Start automatisch erstellt und auf Schreibbarkeit geprueft.

Empfohlene Standardwerte:

- `ATTACHMENT_STORAGE_PATH=shared/uploads`
- `BACKUP_BASE_PATH=shared/backups`
