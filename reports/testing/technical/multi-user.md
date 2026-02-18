# Multi-User und Versionierung

## Garantie: Parallele Aenderungen auf derselben Tour fuehren nicht zu stillen Ueberschreibungen

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Bei zwei gleichzeitigen Updates gewinnt nur eine Aenderung; die zweite Anfrage endet mit Versionskonflikt.
- Referenz:
  - [tests/integration/server/ft04.multi-user.integration.test.ts](../../../tests/integration/server/ft04.multi-user.integration.test.ts)

## Garantie: Veraltete Mitarbeiter-Zuordnungen werden im Parallelfall deterministisch blockiert

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Gleichzeitiges Entfernen und erneutes Zuweisen eines Mitarbeiters erzeugt keinen inkonsistenten Endzustand, sondern einen Konfliktpfad.
- Referenz:
  - [tests/integration/server/ft04.multi-user.integration.test.ts](../../../tests/integration/server/ft04.multi-user.integration.test.ts)

## Garantie: Multi-User-Konflikte sind auch im Mitarbeiter-Lifecycle abgesichert

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Der zweite Update-Versuch mit alter Version wird mit `409 VERSION_CONFLICT` abgewiesen.
- Referenz:
  - [tests/integration/server/employees.lifecycle.ft05.integration.test.ts](../../../tests/integration/server/employees.lifecycle.ft05.integration.test.ts)

## Garantie: Versionen sind verpflichtender Bestandteil von Aenderungspfaden

- Testtyp: Unit und Integration
- Test-DB: Nein (Unit), Ja (Integration)
- Gepruefte Erwartung: Update/Delete mit stale oder fehlender Version liefern Konflikt- bzw. Validierungsfehler statt stiller Ueberschreibung.
- Referenz:
  - [tests/unit/invariants/optimisticLocking.test.ts](../../../tests/unit/invariants/optimisticLocking.test.ts)
  - [tests/integration/server/teamsTours.versioning.test.ts](../../../tests/integration/server/teamsTours.versioning.test.ts)
  - [tests/integration/server/projectAppointments.version.test.ts](../../../tests/integration/server/projectAppointments.version.test.ts)