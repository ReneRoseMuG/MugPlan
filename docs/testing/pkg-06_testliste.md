# PKG-06 Testliste

## Ziel von PKG-06
PKG-06 sichert die Transaktionsgarantie fuer Batch-Zuweisungen:

1. Bei Teilfehler in einer Batch-Mutation erfolgt kompletter Rollback.
2. Es darf kein partieller Zwischenzustand in der Datenbank verbleiben.

Der Test in diesem Paket ist ein Integrationstest mit echter Test-Datenbank.

## Abdeckungsuebersicht
- Datei `tests/integration/batch/batchRollback.test.ts`: 1 Integrationstest

## Datei `tests/integration/batch/batchRollback.test.ts`

### 1) `rolls back complete batch when one item has stale version (no partial updates)`
- Service/Funktion: `teamEmployeesService.assignEmployeesToTeam`
- Given:
  - Frische Testdatenbank (`resetDatabase` vor dem Testlauf).
  - Ein Team und 5 Mitarbeiter mit gueltiger Startversion (`version = 1`).
  - Batch mit 5 Assign-Items, wobei ein Item absichtlich falsche Version nutzt.
- When:
  - `assignEmployeesToTeam(teamId, items)` wird ausgefuehrt.
- Then:
  - Aufruf endet mit `409 VERSION_CONFLICT`.
  - Alle 5 Mitarbeiter bleiben unveraendert:
    - `teamId` bleibt `null`
    - `version` bleibt `1`
- Kontext:
  - Der Service verarbeitet die Items sequentiell in einer DB-Transaktion.
  - Dieser Test beweist, dass vorherige erfolgreiche Einzelupdates im selben Batch nicht teilweise persistiert werden, wenn spaeter ein Konflikt auftritt.

## Warum dieser Test wichtig ist
- Er belegt die geforderte Atomicity fuer Batch-Mutationen.
- Er verhindert inkonsistente Teilergebnisse bei konkurrierenden Aenderungen.
- Er ist die Grundlage fuer das naechste Integrationspaket zur Join-Atomicity.
