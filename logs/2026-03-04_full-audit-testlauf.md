# Vollständiger Audit- und Testlauf

## Zweck
Durchführung eines vollständigen Audit-Laufs und anschließender vollständiger Testausführung inklusive Bericht der grünen/roten Tests.

## Scope
- Pflichtlektüre geprüft:
  - `docs/architecture.md`
  - `docs/implementation.md`
- Safety-Gate vor Testausführung geprüft
- Audit-Skripte ausgeführt
- Vollständiger Vitest-Gesamtlauf ausgeführt

## Technische Entscheidungen
- Audit als Kombination aus:
  - `npm run check` (Encoding, destructive inventory, TypeScript)
  - `npm run review` (typecheck, lint, audit, secrets)
- Vollständiger Testlauf über:
  - `npm run test:run`
- Exakte Testanzahl per maschinenlesbarem Report bestimmt:
  - `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --reporter=json --outputFile .tmp/vitest-report.json`

## Safety-Gate Nachweis (vor Testlauf)
1. `.env.test` vorhanden:
   - `../../shared/.env.test` existiert.
2. Testmodus aktiv:
   - Testkommando setzt `NODE_ENV=test` und `MUGPLAN_MODE=test`.
   - `tests/setup.env.ts` setzt ebenfalls `NODE_ENV=test` und `MUGPLAN_MODE=test`.
3. Test-DB-Ziel ausschließlich aus Test-Env:
   - `server/config/runtimeEnv.ts` lädt im Testmodus verpflichtend `../../shared/.env.test` (kein Fallback).
   - Pflichtfelder `DB_ALLOWED_DATABASES_TEST` und `DB_ALLOWED_HOSTS_TEST` werden erzwungen.
4. Guard-APIs für DB-Connect/destruktive Aktionen aktiv:
   - `server/db.ts` nutzt `assertTestMode()` + `assertSafeWriteTargetForTestMode()` vor Pool-Erzeugung.
   - `tests/helpers/resetDatabase.ts` nutzt `assertSafeDestructiveOperationTarget()` + `assertSqlDatabaseIdentity()`.

## Ausführung und Ergebnis

### 1) Audit-Lauf
- `npm run check`: **erfolgreich**
  - Encoding check passed
  - Destructive path inventory check passed
  - TypeScript-Check erfolgreich

- `npm run review`: **fehlgeschlagen**
  - Stop bei ESLint-Fehler:
    - Datei: `client/src/components/ui/badge-previews/attachment-info-badge-preview.tsx`
    - Fehler: `'attachmentPreviewSizeOptions' is assigned a value but only used as a type`
  - Folge: `npm audit` und `npm run secrets` wurden in diesem Lauf nicht mehr erreicht.

### 2) Vollständiger Testlauf
- `npm run test:run`: **fehlgeschlagen**
- Exakte Bilanz aus JSON-Report:
  - Gesamt: **746**
  - Grün (passed): **742**
  - Rot (failed): **4**

### 3) Rote Tests
1. `tests/integration/server/ft07.backup-and-caldav.integration.test.ts`
   - `creates real backup files and logs success, then skips on no_changes`
2. `tests/integration/server/ft07.backup-and-caldav.integration.test.ts`
   - `exposes backup logs and downloads via admin API`
3. `tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx`
   - `resolves explicit option sizes for small, medium and large`
4. `tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx`
   - `renders dynamic container and iframe heights from the selected profile`

## Betroffene Dateien
- `docs/architecture.md` (gelesen)
- `docs/implementation.md` (gelesen)
- `server/config/runtimeEnv.ts` (Safety-Gate geprüft)
- `server/db.ts` (Safety-Gate geprüft)
- `server/security/dbSafetyGuards.ts` (Safety-Gate geprüft)
- `tests/setup.env.ts` (Safety-Gate geprüft)
- `tests/helpers/resetDatabase.ts` (Safety-Gate geprüft)
- `logs/2026-03-04_full-audit-testlauf.md` (neu)

## Hinweise zum Testen
- Für reproduzierbaren Gesamtlauf:
  1. `npm run check`
  2. `npm run review`
  3. `npm run test:run`
  4. Optional exakte Zählung via JSON-Report (`--reporter=json`)

## Bekannte Einschränkungen
- Wegen ESLint-Fehler in `npm run review` wurden die Teilschritte `npm audit` und `npm run secrets` in diesem Durchlauf nicht ausgeführt.
- Gemäß Teststrategie wurden keine eigenmächtigen Fixes an fehlgeschlagenen Tests vorgenommen.
