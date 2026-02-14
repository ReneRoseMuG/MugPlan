# Implementierungs-Log: Appointments Multi-User Konsistenz (Phase 2)

Datum: 2026-02-14

## Ziel
- Umsetzung von Optimistic Locking und transaktionaler Konsistenz fuer alle Appointment-Mutationen.
- Keine Architektur-Neuorganisation, nur gezielte Erweiterung bestehender Dateien.

## Scope
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `DELETE /api/appointments/:id`
- Join-Tabellen-Pfad `appointment_employee` innerhalb derselben Mutationen

## Umgesetzte Aenderungen
- Contract angepasst:
  - `PATCH /api/appointments/:id` erwartet `version: number`.
  - `DELETE /api/appointments/:id` erwartet Body mit `version: number`.
  - Einheitliche Fehlercodes fuer Mutationen:
    - `LOCK_VIOLATION` (403)
    - `BUSINESS_CONFLICT` (409)
    - `VERSION_CONFLICT` (409)
    - `VALIDATION_ERROR` (422)
- Controller angepasst:
  - Parsing von `version` fuer `PATCH` und `DELETE`.
  - Zod-Validierungsfehler als `422 { code: "VALIDATION_ERROR" }`.
  - Service-Fehler als `{ code: ... }` ausgegeben.
- Repository (`server/repositories/appointmentsRepository.ts`) in-place erweitert:
  - transaktionale `...Tx`-Primitive
  - tagbasierte Overlap-Pruefung im Tx
  - versioniertes Update mit atomarer Pruefung (`WHERE id AND version`, `version = version + 1`)
  - versioniertes Delete mit atomarer Pruefung (`WHERE id AND version`)
  - atomarer Replace von `appointment_employee` im Tx
- Service angepasst:
  - Deterministische Reihenfolge fuer Update:
    - Load -> Lock -> Business -> Versioned Update -> Join Replace
  - Delete:
    - Load -> Lock -> Versioned Delete
  - Create:
    - Projekt-Existenz -> Business-Check -> Insert -> Join-Insert
  - Overlap-Semantik bewusst tagbasiert (Uhrzeit wird ignoriert).
  - `project.is_active` bewusst nicht serverseitig erzwungen (aus Scope).

## Betroffene Dateien
- `shared/routes.ts`
- `server/controllers/appointmentsController.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/appointmentsService.ts`

## Verifikation
- `npm run typecheck` erfolgreich.
- `npm run build` erfolgreich.

## Hinweise
- Keine neuen Repository-Dateien/Klassen/Interfaces angelegt.
- Keine Tests in dieser Phase implementiert (gem. Vorgabe).
