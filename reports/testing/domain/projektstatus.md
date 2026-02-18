# Projektstatus

## Regel: Update ohne gueltige Version ist nicht zulaessig

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Fehlende oder stale Version fuehrt zu `422` bzw. `409 VERSION_CONFLICT`.
- Referenz:
  - [tests/integration/server/projectStatus.lifecycle.test.ts](../../../tests/integration/server/projectStatus.lifecycle.test.ts)

## Regel: Aktiv/Inaktiv-Umschaltung ist versionsgebunden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Toggle funktioniert mit korrekter Version; Update/Toggle/Delete uebergeben Versionen konsistent.
- Referenz:
  - [tests/integration/server/projectStatus.lifecycle.test.ts](../../../tests/integration/server/projectStatus.lifecycle.test.ts)
  - [tests/unit/ui/projectStatusPage.actions.test.tsx](../../../tests/unit/ui/projectStatusPage.actions.test.tsx)

## Regel: Standard- oder verwendete Statuswerte duerfen nicht geloescht werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Delete wird blockiert, wenn Status als Default markiert oder noch in Verwendung ist.
- Referenz:
  - [tests/integration/server/projectStatus.lifecycle.test.ts](../../../tests/integration/server/projectStatus.lifecycle.test.ts)
  - [tests/unit/ui/projectStatusPage.actions.test.tsx](../../../tests/unit/ui/projectStatusPage.actions.test.tsx)

## Regel: Nur aktive Statuswerte duerfen Projekten zugeordnet werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Zuordnung inaktiver Status wird mit Business-Konflikt blockiert.
- Referenz:
  - [tests/integration/server/projectStatus.relations.test.ts](../../../tests/integration/server/projectStatus.relations.test.ts)
  - [tests/unit/invariants/projectStatusAssignmentRules.test.ts](../../../tests/unit/invariants/projectStatusAssignmentRules.test.ts)

## Regel: Status-Relationen sind versionsgebunden und idempotent auf Fehlerpfaden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Doppelte Adds liefern Konflikt, stale Remove liefert Konflikt, fehlende Relation liefert NOT_FOUND.
- Referenz:
  - [tests/integration/server/projectStatus.relations.test.ts](../../../tests/integration/server/projectStatus.relations.test.ts)
  - [tests/unit/invariants/projectStatusAssignmentRules.test.ts](../../../tests/unit/invariants/projectStatusAssignmentRules.test.ts)

## Regel: Lesbarkeit und Schreibrechte folgen der Rolle

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht-Admins sehen aktive Listen; LESER hat nur Leserechte, DISPONENT darf Relationen pflegen.
- Referenz:
  - [tests/integration/server/projectStatus.visibility.by-role.test.ts](../../../tests/integration/server/projectStatus.visibility.by-role.test.ts)
  - [tests/unit/authorization/projectStatusAuthorization.test.ts](../../../tests/unit/authorization/projectStatusAuthorization.test.ts)