# Tour

## Regel: Touren koennen mit validen Werten erstellt und geaendert werden

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Gueltige Tourerstellung funktioniert; ungueltige Payloads werden mit Validierungsfehlerpfad abgewiesen.
- Referenz:
  - [tests/integration/server/ft04.tour-management.integration.test.ts](../../../tests/integration/server/ft04.tour-management.integration.test.ts)

## Regel: Tournamen bleiben systemgesteuert und kollisionsfrei

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Mehrfaches Erstellen erzeugt eindeutige Namen; Name-Aenderungen werden nicht als frei editierbarer Fachwert behandelt.
- Referenz:
  - [tests/integration/server/ft04.tour-management.integration.test.ts](../../../tests/integration/server/ft04.tour-management.integration.test.ts)

## Regel: Mitarbeiter gehoeren jeweils nur zu einer Tour zur selben Zeit

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Reassign verschiebt den Mitarbeiter auf die neue Tour; die alte Tour verliert die Mitgliedschaft.
- Referenz:
  - [tests/integration/server/ft04.employee-tour-relationship.integration.test.ts](../../../tests/integration/server/ft04.employee-tour-relationship.integration.test.ts)

## Regel: Tour-Loeschung bereinigt Mitarbeiterzuordnung

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Nach Delete wird `employee.tourId` auf `null` gesetzt; unbekannte Tour-ID liefert `404`.
- Referenz:
  - [tests/integration/server/ft04.tour-management.integration.test.ts](../../../tests/integration/server/ft04.tour-management.integration.test.ts)

## Regel: Tour-Update/Delete ist versionsgebunden und multi-user-fest

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Stale Versionen fuehren zu Konflikten; UI-Wiring uebergibt Versionen an Update/Delete- und Batch-Pfade.
- Referenz:
  - [tests/integration/server/teamsTours.versioning.test.ts](../../../tests/integration/server/teamsTours.versioning.test.ts)
  - [tests/integration/server/ft04.multi-user.integration.test.ts](../../../tests/integration/server/ft04.multi-user.integration.test.ts)
  - [tests/unit/ui/tourManagement.versioning.test.tsx](../../../tests/unit/ui/tourManagement.versioning.test.tsx)
