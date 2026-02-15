# Dokument-Extraktion Testlauf – 2026-02-15

## Rahmen
- Auftrag: Pflicht-KI-Integrationstests ausfuehren, kompletten Lauf dokumentieren, **keine Fixes**.
- Code-Fixes: **keine** (nur Testlauf, Auswertung, Dokumentation).

## Testumfang
- Neue/erweiterte Extraktions-Tests (Mock + Live-KI):
  - `tests/integration/server/documentExtraction.routes.test.ts`
  - `tests/integration/server/documentExtraction.routes.liveAi.test.ts`
  - `tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts`
  - `tests/unit/validation/extractionValidator.structure.test.ts`
  - `tests/unit/services/documentProcessing.customerResolution.test.ts`
  - `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
  - `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
- Vollstaendiger Suite-Lauf via `vitest run`.

## Laufkommandos
1. Preflight KI-Endpunkt:
   - `node -e "fetch('http://127.0.0.1:11434/api/tags')..."`
2. Extraktions-Gesamtlauf:
   - `npm run test:extraction`
3. Vollstaendiger Lauf:
   - `npm run test:run`
4. Strukturierte Voll-Lauf-Auswertung:
   - `npx vitest run --reporter=json --outputFile logs/2026-02-15_test-run_full.json`

## Ergebnis Uebersicht
### KI-Preflight
- Ergebnis: **fehlgeschlagen** (`fetch failed`), Ollama-Endpunkt `127.0.0.1:11434` nicht erreichbar.

### `npm run test:extraction`
- `test:extraction:mock`: **7/7 Testdateien gruen**, **30/30 Tests gruen**.
- `test:extraction:live`: **2/2 Testdateien rot**, **4/4 Tests rot**.
- Hauptursache live: `ECONNREFUSED 127.0.0.1:11434` in `server/services/aiExtractionService.ts:58`.

### `npm run test:run` (vollstaendig)
- Quelle: `logs/2026-02-15_test-run_full.json`
- Testdateien: **84 gesamt**, **70 gruen**, **14 rot**.
- Tests: **138 gesamt**, **125 gruen**, **13 rot**.
- Gesamtstatus: **FAILED**.

## Fehlertabelle (voller Lauf)
| Datei | Testfall | Befund | Stack-Hotspot | Reproduzierbarkeit |
|---|---|---|---|---|
| `tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts` | `...project_form` | `TypeError: fetch failed` (KI nicht erreichbar) | `server/services/aiExtractionService.ts:58` | Ja |
| `tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts` | `...appointment_form` | `TypeError: fetch failed` (KI nicht erreichbar) | `server/services/aiExtractionService.ts:58` | Ja |
| `tests/integration/server/documentExtraction.routes.liveAi.test.ts` | `...project_form` | Erwartet 200, erhalten 500 | `tests/integration/server/documentExtraction.routes.liveAi.test.ts:61` | Ja |
| `tests/integration/server/documentExtraction.routes.liveAi.test.ts` | `...appointment_form` | Erwartet 200, erhalten 500 | `tests/integration/server/documentExtraction.routes.liveAi.test.ts:79` | Ja |
| `tests/integration/server/documentExtraction.routes.test.ts` | `returns 400 for non-pdf uploads` | Login erwartet 200, erhalten 409 | `tests/integration/server/documentExtraction.routes.test.ts:61` | Ja (in diesem Lauf) |
| `tests/integration/server/documentExtraction.routes.test.ts` | `returns 422 when extraction has no extractable text` | Erwartet 422, erhalten 503 | `tests/integration/server/documentExtraction.routes.test.ts:103` | Ja (in diesem Lauf) |
| `tests/integration/batch/batchRollback.test.ts` | `rolls back complete batch ...` | Erwartet 409/`VERSION_CONFLICT`, stattdessen 404/`NOT_FOUND` | `tests/integration/batch/batchRollback.test.ts` (Assertion) | Ja (in diesem Lauf) |
| `tests/integration/joins/joinReplaceAtomicity.test.ts` | `keeps join relations unchanged ...` | Erwartet Join-IDs `[6,7]`, erhalten `[]` | `tests/integration/joins/joinReplaceAtomicity.test.ts:57` | Ja (in diesem Lauf) |
| `tests/integration/server/projectStatus.relations.test.ts` | `adds relation ... VERSION_CONFLICT` | Erwartet 201, erhalten 503 | `tests/integration/server/projectStatus.relations.test.ts:111` | Ja (in diesem Lauf) |
| `tests/integration/seed/demoSeed.base.core.test.ts` | `creates exactly three teams and three tours...` | FK-Fehler `seed_run_entity_seed_run_fk` | `mysql2/promise/pool.js:36` | Ja |
| `tests/integration/seed/demoSeed.base.core.test.ts` | `assigns 1-3 employees per team/tour...` | FK-Fehler `seed_run_entity_seed_run_fk` | `mysql2/promise/pool.js:36` | Ja |
| `tests/integration/seed/demoSeed.base.core.test.ts` | `assigns random 1-2 selected statuses...` | FK-Fehler `seed_run_entity_seed_run_fk` | `mysql2/promise/pool.js:36` | Ja |
| `tests/integration/seed/demoSeed.base.core.test.ts` | `rejects invalid base seed payload...` | Erwartet 400-Validierung, stattdessen FK-Fehler | `tests/integration/seed/demoSeed.base.core.test.ts` (Assertion) | Ja (in diesem Lauf) |

## Kurzfazit
- Extraktions-Mock-Schicht ist stabil (gruen).
- Pflicht-Live-KI-Tests sind korrekt im Pflichtlauf enthalten, aber in dieser Umgebung rot, weil lokale KI (`127.0.0.1:11434`) nicht erreichbar ist.
- Der Voll-Lauf zeigt zusaetzlich bestehende Integrationsprobleme ausserhalb der reinen Extraktion (Seed/Relations/Batch/Join).
- Umsetzung gemaess Auftrag: **ohne Fixes**.
