# 2026-02-14 – Multi-User Konsistenzprüfung (Phase 3 Follow-up)

## Anlass
Nachprüfung und Nachschärfung der globalen Non-Appointment-Mutationen gemäß NFR-01:
- atomare Versionsprüfung
- 404/409-Differenzierung
- Transaktionsdisziplin bei Batch/Multi-Table
- konsistente Fehlercodes

## Prüf- und Umsetzungsumfang
- Repositories, Services, Controller für Non-Appointment-Mutationen
- Keine Appointment-Änderungen als Ziel dieser Aufgabe
- Keine neue Architektur/Repository-Klassen eingeführt

## Durchgeführte Korrekturen
1. **404 vs 409 differenziert**
- Services wurden so angepasst, dass bei `version_conflict` zuerst Existenz geprüft wird.
- Ergebnis:
  - nicht vorhanden -> `NOT_FOUND` (404)
  - vorhanden, aber Version veraltet -> `VERSION_CONFLICT` (409)

2. **Versionslogik in SQL gesichert**
- Versionierte UPDATE/DELETE-Pfade bleiben atomar (`WHERE ... AND version = ?`).
- `version = version + 1` bleibt im selben UPDATE-Statement.

3. **Transaktionsverhalten abgesichert**
- Batch-Zuweisungen Team/Tour bleiben in `db.transaction(...)` mit fail-fast.
- Kein partieller Write bei Konflikt.

4. **Projects Delete robust gemacht**
- In `deleteProjectWithVersion` wird die Version zu Tx-Beginn validiert (atomar),
  anschließend relationale Deletes und finaler Delete in derselben Transaktion.

5. **Fehlercode-Harmonisierung in Mutations-Controllern**
- Mapping auf `{ code: ... }` vereinheitlicht für:
  - `NOT_FOUND`
  - `VALIDATION_ERROR`
  - `VERSION_CONFLICT`
  - `BUSINESS_CONFLICT` (wo fachlich verwendet)

## Wichtige geänderte Dateien (Auszug)
- `server/services/projectsService.ts`
- `server/repositories/projectsRepository.ts`
- `server/services/teamEmployeesService.ts`
- `server/services/tourEmployeesService.ts`
- `server/services/notesService.ts`
- `server/services/projectStatusService.ts`
- `server/services/usersService.ts`
- `server/controllers/usersController.ts`
- `server/controllers/helpTextsController.ts`
- `server/controllers/projectStatusController.ts`

## Verifikation
- `npm run typecheck` -> erfolgreich
- `npm run build` -> erfolgreich

## Ergebnis
Die Follow-up-Aufgabe zur Stabilisierung der Multi-User-Konsistenz (Phase 3, non-appointments) ist im Code umgesetzt und kompilierbar verifiziert.
