# 2026-02-14 – Multi-User Konsistenz Phase 3 (globale Endpoint-Umstellung)

## Ziel
Globale Umstellung aller mutierenden Non-Appointment-Endpunkte auf versionsbasierte Konflikterkennung (Optimistic Locking) gemäß NFR-01.

## Scope
- Enthalten: Non-appointment Mutationen (PATCH/PUT/DELETE + relationale Mutationen laut Phase-3-Plan)
- Ausgeschlossen: `appointments`, Read-only, Admin/Seed-spezifische Flows, reine Download/Upload-Leseoperationen

## Umgesetzte Punkte
- `shared/routes.ts`:
  - Version-Felder für mutierende Contracts ergänzt/harmonisiert (`version >= 1`).
  - Fehlerantworten auf konsistente Codes erweitert (`VERSION_CONFLICT`, `VALIDATION_ERROR`, `NOT_FOUND` je Endpoint-Kontext).
  - Batch-Relation-Contracts für Team/Tour-Zuweisungen auf versionsfähige Payloads angepasst (`items[{ employeeId, version }]`).

- Repositories (in-place erweitert, keine neuen Repository-Klassen/Dateien):
  - Versionierte UPDATE-Statements mit atomarer Prüfung (`WHERE id = ? AND version = ?`) und `version = version + 1`.
  - Versionierte DELETE-Statements mit atomarer Prüfung.
  - Multi-Table-Delete bei Projekten transaktional gekapselt.
  - Relationale Writes für Notes/Status/Assignments konsistent auf Version-Konflikt auswertbar gemacht.

- Services:
  - `affectedRows === 0` auf Version-Konflikt/Not-Found-Pfade vereinheitlicht.
  - Fehlercodes für Mutationen auf definierte API-Codes harmonisiert.
  - Transaktionen dort eingesetzt, wo mehrere Tabellen/mehrere Zielrows mutiert werden.

- Controller:
  - Request-Parsing der neuen `version`-Felder ergänzt.
  - Einheitliches Mapping auf maschinenlesbare Fehlercodes (`code`).
  - `ZodError`-Mapping auf `422 VALIDATION_ERROR` für Mutationen vereinheitlicht.

## Verifikation
- Typecheck: `npm run typecheck` erfolgreich.
- Build: `npm run build` erfolgreich.

## Hinweise
- Keine neue Architektur-Schicht eingeführt.
- Keine Appointment-Änderungen in dieser Phase.
- Keine Tests implementiert (gemäß Auftrag).
