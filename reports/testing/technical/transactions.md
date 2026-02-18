# Transaktionen und Atomaritaet

## Garantie: Batch-Operationen werden bei Konflikt vollstaendig zurueckgerollt

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Enthaelt ein Batch einen stale Versionsfall, wird kein Teilupdate persistiert.
- Referenz:
  - [tests/integration/batch/batchRollback.test.ts](../../../tests/integration/batch/batchRollback.test.ts)

## Garantie: Join-Replace arbeitet atomar bei ungueltigen Zielwerten

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Bei ungueltiger Employee-ID bleibt die bestehende Join-Relation unveraendert.
- Referenz:
  - [tests/integration/joins/joinReplaceAtomicity.test.ts](../../../tests/integration/joins/joinReplaceAtomicity.test.ts)

## Garantie: Konfliktbehandlung in Join-Flows ist ueber mehrere Zuweisungsarten konsistent

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Tour-, Team- und manuelle Zuordnung bleiben konflikt-sicher; geblockte Mitarbeiter werden nicht teilweise uebernommen.
- Referenz:
  - [tests/integration/server/appointments.employee-overlap.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.integration.test.ts)
  - [tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts)
  - [tests/integration/server/appointments.employee-overlap.flow.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.flow.integration.test.ts)
