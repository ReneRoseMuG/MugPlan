# Projekt

## Regel: Projekte ohne Termine sind loeschbar

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Delete eines Projekts ohne zugeordnete Termine liefert `204`.
- Referenz:
  - [tests/integration/server/projects.delete.rules.test.ts](../../../tests/integration/server/projects.delete.rules.test.ts)

## Regel: Projekte mit bestehenden Terminen duerfen nicht geloescht werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Bei vorhandenen Terminen wird Delete mit `409 BUSINESS_CONFLICT` blockiert.
- Referenz:
  - [tests/integration/server/projects.delete.rules.test.ts](../../../tests/integration/server/projects.delete.rules.test.ts)
  - [tests/unit/invariants/optimisticLocking.test.ts](../../../tests/unit/invariants/optimisticLocking.test.ts)

## Regel: Projekt-Loeschung mit veralteter Version wird abgewiesen

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Stale Version bei Delete endet mit `409 VERSION_CONFLICT`.
- Referenz:
  - [tests/integration/server/projects.delete.rules.test.ts](../../../tests/integration/server/projects.delete.rules.test.ts)
  - [tests/unit/invariants/optimisticLocking.test.ts](../../../tests/unit/invariants/optimisticLocking.test.ts)

## Regel: Unbekannte Projekte liefern beim Delete einen NOT_FOUND-Pfad

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Delete auf unbekannte Projekt-ID liefert `404 NOT_FOUND`.
- Referenz:
  - [tests/integration/server/projects.delete.rules.test.ts](../../../tests/integration/server/projects.delete.rules.test.ts)