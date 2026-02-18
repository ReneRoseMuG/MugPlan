# 2026-02-14 – Multi-User Härtung (Weg B)

## Ziel
Herstellung vollständigerer NFR-01-Konfliktstabilität durch Entfernen interner Bypass-Pfade und Schließen von Race-Conditions,
ohne neue Features und ohne Architekturumbau.

## Umgesetzte Maßnahmen

### 1. `storage.ts` Bypass entfernt
- Mutationssignaturen auf verpflichtende Version umgestellt (kein optionales `version` mehr).
- Relevante Writes verlangen nun strikt `version: number`.

### 2. Legacy-Fallbacks entfernt
- In den betroffenen Services wurden optionale Versionsparameter entfernt.
- Keine unversionierten Fallback-Write-Pfade mehr in diesen Services.
- Runtime-Guards ergänzt: `version` muss Integer und `>= 1` sein, sonst `VALIDATION_ERROR`.

### 3. `user_settings_value` Upsert-Race behoben
- `upsertSettingValueWithVersion` transaktional umgesetzt.
- Ablauf: versioniertes UPDATE -> (bei erwarteter Initialversion) INSERT im selben Tx.
- Duplicate-Key wird deterministisch als `version_conflict` behandelt (kein 500 durch Parallelität).

### 4. Note-Create atomar gemacht
- `note`-Insert + Relation-Insert (`customer_note` bzw. `project_note`) in eine DB-Transaktion gelegt.
- Neue Tx-Primitive in bestehender Repository-Datei (`notesRepository.ts`) ergänzt.
- Kein verwaister Note-Datensatz bei Teilfehlern.

### 5. Harte Guards
- Einheitliche Runtime-Prüfungen für Version in Mutationsservices (`version >= 1`).
- Konfliktpfade bleiben differenziert (`NOT_FOUND` vs `VERSION_CONFLICT`) über Exists-Checks.

## Geänderte Dateien
- `server/storage.ts`
- `server/repositories/notesRepository.ts`
- `server/repositories/userSettingsRepository.ts`
- `server/services/customersService.ts`
- `server/services/employeesService.ts`
- `server/services/teamsService.ts`
- `server/services/toursService.ts`
- `server/services/projectsService.ts`
- `server/services/notesService.ts`
- `server/services/noteTemplatesService.ts`
- `server/services/helpTextsService.ts`
- `server/services/projectStatusService.ts`
- `server/services/teamEmployeesService.ts`
- `server/services/tourEmployeesService.ts`
- `server/services/usersService.ts`
- `server/services/userSettingsService.ts`
- `server/services/customerNotesService.ts`
- `server/services/projectNotesService.ts`

## Verifikation
- `npm run typecheck` erfolgreich
- `npm run build` erfolgreich
- Suchlauf bestätigt: keine optionalen `version?:` / `expectedVersion?:` in `server/` und `shared/`.

## Ausschlüsse eingehalten
- Keine Appointment-Änderungen.
- Keine Demo/Seed-Änderungen.
- Keine neuen Architektur-Schichten.
- Keine Tests implementiert.
