# FT05/FT05+ Employee Test Expansion Report

## Pflichtbestaetigung
architecture.md und rules.md gelesen und verstanden.

## IST-Analyse (Employee)
- Endpunkte:
  - GET /api/employees?scope=active|inactive
  - GET /api/employees/:id
  - POST /api/employees
  - PUT /api/employees/:id
  - PATCH /api/employees/:id/active
  - GET /api/employees/:id/current-appointments
- Versionierung:
  - PUT/PATCH erwarten version >= 1.
  - Erfolgreiche Updates erhoehen version um 1.
  - Stale version fuehrt zu 409 VERSION_CONFLICT.
  - Nicht existente IDs fuehren zu 404 NOT_FOUND.
  - DTO-Validierung liefert im IST 422 VALIDATION_ERROR.

## Neu erstellte Testdateien
- tests/unit/services/employeesService.ft05.test.ts
- tests/unit/validation/employees.dto.validation.ft05.test.ts
- tests/integration/server/employees.lifecycle.ft05.integration.test.ts
- tests/integration/server/employees.current-appointments.ft05.integration.test.ts

## Aktualisierte Dokumentation
- docs/TEST_MATRIX.md

## Ausgefuehrter Testlauf
- Befehl:
  - npx vitest run tests/unit/services/employeesService.ft05.test.ts tests/unit/validation/employees.dto.validation.ft05.test.ts tests/integration/server/employees.lifecycle.ft05.integration.test.ts tests/integration/server/employees.current-appointments.ft05.integration.test.ts tests/integration/server/employees.visibility.by-role.test.ts

## Ergebnis
- Testdateien gesamt: 5
- Erfolgreiche Testdateien: 4
- Fehlgeschlagene Testdateien: 1
- Tests gesamt: 50
- Erfolgreiche Tests: 47
- Fehlgeschlagene Tests: 3

## Fehlgeschlagene Tests (faktisch)
- tests/integration/server/employees.visibility.by-role.test.ts
  - keeps non-admin employee list on active scope even when inactive is requested
  - returns 404 for non-admin employee detail when employee is inactive
  - returns 403 FORBIDDEN when non-admin tries to toggle employee isActive
- Fehlerursache laut Laufausgabe:
  - Username already exists
