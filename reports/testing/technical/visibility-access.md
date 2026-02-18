# Sichtbarkeit und Zugriff

## Garantie: Nicht-Admin-Listen werden auf aktive Datensaetze begrenzt

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Angefragte Inaktiv-Scope-Werte werden fuer Nicht-Admins effektiv auf `active` begrenzt.
- Referenz:
  - [tests/integration/server/customers.visibility.by-role.test.ts](../../../tests/integration/server/customers.visibility.by-role.test.ts)
  - [tests/integration/server/employees.visibility.by-role.test.ts](../../../tests/integration/server/employees.visibility.by-role.test.ts)
  - [tests/integration/server/projectStatus.visibility.by-role.test.ts](../../../tests/integration/server/projectStatus.visibility.by-role.test.ts)
  - [tests/unit/authorization/projectStatusAuthorization.test.ts](../../../tests/unit/authorization/projectStatusAuthorization.test.ts)

## Garantie: Inaktive Detailobjekte sind fuer Nicht-Admins nicht lesbar

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Detailabrufe auf inaktive Kunden oder Mitarbeiter liefern fuer Nicht-Admins `404` bzw. `null`.
- Referenz:
  - [tests/integration/server/customers.visibility.by-role.test.ts](../../../tests/integration/server/customers.visibility.by-role.test.ts)
  - [tests/integration/server/employees.visibility.by-role.test.ts](../../../tests/integration/server/employees.visibility.by-role.test.ts)
  - [tests/unit/services/employeesService.ft05.test.ts](../../../tests/unit/services/employeesService.ft05.test.ts)

## Garantie: Schreibrechte sind rollenabhaengig serverseitig erzwungen

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht erlaubte Rollen erhalten deterministisch `403 FORBIDDEN` bei geschuetzten Aktionen.
- Referenz:
  - [tests/integration/server/ft04.role.integration.test.ts](../../../tests/integration/server/ft04.role.integration.test.ts)
  - [tests/integration/server/projectStatus.visibility.by-role.test.ts](../../../tests/integration/server/projectStatus.visibility.by-role.test.ts)
  - [tests/unit/authorization/roleGuards.test.ts](../../../tests/unit/authorization/roleGuards.test.ts)
  - [tests/unit/authorization/projectStatusAuthorization.test.ts](../../../tests/unit/authorization/projectStatusAuthorization.test.ts)

## Garantie: Rollenauflosung ist kanonisch und nicht optional

- Testtyp: Unit
- Test-DB: Nein
- Gepruefte Erwartung: Middleware setzt `req.userContext` konsistent und liefert bei fehlendem User-Kontext einen klaren Fehlerpfad.
- Referenz:
  - [tests/unit/authorization/roleGuards.test.ts](../../../tests/unit/authorization/roleGuards.test.ts)