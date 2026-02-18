# Team

## Regel: Team-Namen werden serverseitig erzeugt und nicht aus Clientwerten uebernommen

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Beim Erstellen wird ein generierter Teamname verwendet; mitgelieferte Client-Namen werden ignoriert.
- Referenz:
  - [tests/integration/server/ft11.team-management.integration.test.ts](../../../tests/integration/server/ft11.team-management.integration.test.ts)
  - [tests/unit/services/teamsService.ft11.test.ts](../../../tests/unit/services/teamsService.ft11.test.ts)

## Regel: Team-Mitgliedschaft wird ueber dedizierte Endpunkte konsistent gepflegt

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Hinzufuegen, Entfernen und Vollersetzung von Teammitgliedern liefern konsistente Ergebnislisten ohne stale Relationen.
- Referenz:
  - [tests/integration/server/ft11.team-management.integration.test.ts](../../../tests/integration/server/ft11.team-management.integration.test.ts)

## Regel: Doppelte Zuweisungen in einer Team-Batch-Anfrage sind nicht zulaessig

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Mehrfachzuweisung desselben Mitarbeiters in einem Batch liefert `VERSION_CONFLICT`.
- Referenz:
  - [tests/integration/server/ft11.team-management.integration.test.ts](../../../tests/integration/server/ft11.team-management.integration.test.ts)

## Regel: Team-Loeschung loest Mitarbeiterrelationen sauber auf

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Nach Team-Delete sind betroffene `employee.teamId`-Beziehungen auf `null` gesetzt.
- Referenz:
  - [tests/integration/server/ft11.team-management.integration.test.ts](../../../tests/integration/server/ft11.team-management.integration.test.ts)

## Regel: Team-Update/Delete sind versionsgebunden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Stale oder ungueltige Versionen fuehren zu `VERSION_CONFLICT` bzw. `VALIDATION_ERROR`.
- Referenz:
  - [tests/integration/server/teamsTours.versioning.test.ts](../../../tests/integration/server/teamsTours.versioning.test.ts)
  - [tests/unit/services/teamsService.ft11.test.ts](../../../tests/unit/services/teamsService.ft11.test.ts)
  - [tests/unit/ui/teamManagement.versioning.test.tsx](../../../tests/unit/ui/teamManagement.versioning.test.tsx)