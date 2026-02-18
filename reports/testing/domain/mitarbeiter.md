# Mitarbeiter

## Regel: Mitarbeiter werden mit Lifecycle- und Versionslogik gefuehrt

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Create startet mit Version 1; gueltige Updates/Toggles erhoehen die Version jeweils um 1.
- Referenz:
  - [tests/integration/server/employees.lifecycle.ft05.integration.test.ts](../../../tests/integration/server/employees.lifecycle.ft05.integration.test.ts)

## Regel: Stale Versionen bei Mitarbeiteraenderungen werden konfliktfest blockiert

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Update- und Toggle-Aufrufe mit alter Version liefern `409 VERSION_CONFLICT`.
- Referenz:
  - [tests/integration/server/employees.lifecycle.ft05.integration.test.ts](../../../tests/integration/server/employees.lifecycle.ft05.integration.test.ts)
  - [tests/unit/services/employeesService.ft05.test.ts](../../../tests/unit/services/employeesService.ft05.test.ts)

## Regel: Sichtbarkeit inaktiver Mitarbeiter ist rollenabhaengig

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht-Admins sehen effektiv nur aktive Mitarbeiter; Detail auf inaktive Datensaetze ist fuer Nicht-Admins nicht verfuegbar.
- Referenz:
  - [tests/integration/server/employees.visibility.by-role.test.ts](../../../tests/integration/server/employees.visibility.by-role.test.ts)
  - [tests/integration/server/employees.lifecycle.ft05.integration.test.ts](../../../tests/integration/server/employees.lifecycle.ft05.integration.test.ts)
  - [tests/unit/services/employeesService.ft05.test.ts](../../../tests/unit/services/employeesService.ft05.test.ts)

## Regel: Aktiv/Inaktiv-Status darf nur mit Berechtigung geaendert werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht-Admins erhalten bei Statusaenderungen einen `403 FORBIDDEN`-Pfad.
- Referenz:
  - [tests/integration/server/employees.visibility.by-role.test.ts](../../../tests/integration/server/employees.visibility.by-role.test.ts)
  - [tests/integration/server/employees.lifecycle.ft05.integration.test.ts](../../../tests/integration/server/employees.lifecycle.ft05.integration.test.ts)
  - [tests/unit/services/employeesService.ft05.test.ts](../../../tests/unit/services/employeesService.ft05.test.ts)

## Regel: Endpoint fuer aktuelle Mitarbeiter-Termine validiert Eingaben und Fehlerpfade

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Gueltige IDs liefern `200`; ungueltige IDs oder Datumsformate liefern `400`; zusaetzliche IST-Pfade sind dokumentiert.
- Referenz:
  - [tests/integration/server/employees.current-appointments.ft05.integration.test.ts](../../../tests/integration/server/employees.current-appointments.ft05.integration.test.ts)

## Regel: Mitarbeiter-DTOS erzwingen Pflichtfelder und Versionsgueltigkeit

- Testtyp: Unit
- Test-DB: Nein
- Gepruefte Erwartung: Fehlende oder ungueltige Felder/Versionen werden validierungsseitig verworfen.
- Referenz:
  - [tests/unit/validation/employees.dto.validation.ft05.test.ts](../../../tests/unit/validation/employees.dto.validation.ft05.test.ts)