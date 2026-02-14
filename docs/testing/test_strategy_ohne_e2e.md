# Teststrategie ohne E2E (angepasst)

## Summary
- E2E-Tests werden vollständig entfernt.
- Fokus bleibt auf:
  - `tests/unit/**` für Invarianten, Security, Rollen, DTO-Validierung.
  - `tests/integration/**` für DB-Transaktionen, Rollback, Atomizität.
- Coverage-Ziel bleibt: **>=85%**.

## Entfernt
- `tests/e2e/parallel/updateConcurrency.test.ts`
- `tests/e2e/batch/batchApiRollback.test.ts`
- Alle E2E-Server-Helper unter `tests/e2e/helpers/**`
- E2E-Skript-Nutzung (`npm run test:e2e`) aus Umsetzungsumfang.

## Verbleibender Pflichtumfang

### P0 Unit
- `tests/unit/invariants/conflictPriority.test.ts`
- `tests/unit/invariants/optimisticLocking.test.ts`
- `tests/unit/invariants/lockingRules.test.ts`
- `tests/unit/invariants/resetDatabaseGuard.test.ts`
- `tests/unit/authorization/roleGuards.test.ts`
- `tests/unit/validation/dtoValidators.test.ts`

### P1 Unit
- `tests/unit/invariants/attachmentRules.test.ts`

### Integration
- `tests/integration/batch/batchRollback.test.ts`
- `tests/integration/joins/joinReplaceAtomicity.test.ts`

## Anpassung der Concurrency-Abdeckung (statt E2E)
- Parallelitäts-/Versionskonflikt-Szenario wird in Unit + Integration abgesichert:
1. Unit: `optimisticLocking.test.ts` (zwei sequenzielle Updates mit gleicher Startversion, zweiter -> `409 VERSION_CONFLICT`).
2. Integration: zusätzlicher Block in `batchRollback.test.ts` oder eigene Sektion in `joinReplaceAtomicity.test.ts`, der reale Versionskonflikte gegen Test-DB verifiziert.

## Strukturelle Regeln
- Unit: keine echte DB.
- Integration: nur Test-DB + Reset via `tests/helpers/resetDatabase.ts`.
- Keine Dev-DB-Mutation.
- Deterministische Fehlercodes verpflichtend prüfen.

## Log-Datei
- Ergebnis weiterhin in `logs/2026-02-14_test-coverage-plan.md`, jetzt explizit mit Hinweis „E2E ausgeschlossen“.

## Annahmen
- Vitest bleibt einziges Testframework.
- API-Schicht wird über Controller-/Service-Unit-Tests plus Integrationsszenarien ausreichend abgesichert.
