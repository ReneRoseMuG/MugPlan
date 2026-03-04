# Employee Integration-Test Review (Ist-Stand)

Datum: 2026-03-04

## Ziel und Kontext

Diese Notiz dokumentiert die codekonforme Bewertung der vorgeschlagenen Employee-Integrationstests (IT-E-01 bis IT-E-07).

Ausgangspunkt war eine von einem KI-Agenten ohne Codebase-Zugriff erstellte Testliste. Diese wurde gegen den realen Ist-Stand in Route, Controller, Service, Contract und vorhandenen Integrationstests abgeglichen.

## Verwendete Quellen (Codebasis)

- `server/routes/employeesRoutes.ts`
- `server/controllers/employeesController.ts`
- `server/services/employeesService.ts`
- `shared/routes.ts`
- `tests/integration/server/employees.lifecycle.ft05.integration.test.ts`
- `tests/integration/server/ft05.full-uc-coverage.integration.test.ts`
- `tests/integration/server/ft04.employee-tour-relationship.integration.test.ts`

## Ist-Stand der Employee-API (relevant fuer die Bewertung)

- `POST /api/employees` ist vorhanden.
  - Route: `server/routes/employeesRoutes.ts:9`
  - Controller: `server/controllers/employeesController.ts:58`
- `PUT /api/employees/:id` ist vorhanden.
  - Route: `server/routes/employeesRoutes.ts:11`
  - Controller: `server/controllers/employeesController.ts:131`
- `PATCH /api/employees/:id/active` ist vorhanden (Aktiv/Inaktiv-Logik).
  - Route: `server/routes/employeesRoutes.ts:12`
  - Controller: `server/controllers/employeesController.ts:166`
- `DELETE /api/employees/:id` ist als Endpoint vorhanden, aber serverseitig deaktiviert (`405 METHOD_NOT_ALLOWED` fuer ADMIN, `403 FORBIDDEN` fuer unberechtigte Rollen).
  - Route: `server/routes/employeesRoutes.ts:13`
  - Controller-Response: `server/controllers/employeesController.ts:202`, `server/controllers/employeesController.ts:205`
  - Contract: `shared/routes.ts:979`, `shared/routes.ts:982`

## Bewertung der vorgeschlagenen Tests IT-E-01 bis IT-E-07

### IT-E-01 - Employee anlegen: Minimaler Happy Path

Status: `vorhanden/abgedeckt`

Begruendung:
- Create-Happy-Path ist bereits als Integrationstest vorhanden.
- Read-back ueber Liste/Detail ebenfalls vorhanden.

Referenzen:
- `tests/integration/server/employees.lifecycle.ft05.integration.test.ts:113`
- `tests/integration/server/employees.lifecycle.ft05.integration.test.ts:126`

### IT-E-02 - Employee aendern: Happy Path

Status: `vorhanden/abgedeckt`

Begruendung:
- Update-Happy-Path existiert inklusive Versionsinkrement.

Referenz:
- `tests/integration/server/employees.lifecycle.ft05.integration.test.ts:148`

### IT-E-03 - Employee loeschen: physischer Delete-Endpunkt existiert

Status: `nicht passend zum Ist-Code`

Begruendung:
- Physischer Delete ueber Employee-API ist im Ist-Stand nicht freigeschaltet.
- Erwartetes Verhalten ist `405 METHOD_NOT_ALLOWED` (fuer ADMIN), nicht erfolgreiche Loeschung.

Referenzen:
- `server/controllers/employeesController.ts:205`
- `shared/routes.ts:982`
- `tests/integration/server/ft05.full-uc-coverage.integration.test.ts:269`

### IT-E-04 - Employee loeschen ist blockiert bei Abhaengigkeiten

Status: `nicht passend zum aktiven API-Verhalten`

Begruendung:
- Der aktuell aktive Controller-Pfad blockiert Delete bereits pauschal mit `405`.
- Damit wird der fachliche Konfliktpfad (`BUSINESS_CONFLICT`) auf API-Ebene aktuell nicht erreicht.
- Ein interner Servicepfad fuer `BUSINESS_CONFLICT` existiert, ist aber fuer den aktuellen Endpoint nicht der wirksame Laufzeitpfad.

Referenzen:
- `server/controllers/employeesController.ts:205`
- `server/services/employeesService.ts:146`
- `server/services/employeesService.ts:160`

### IT-E-05 - Employee archivieren ist kein Ersatz fuer Delete

Status: `vorhanden/abgedeckt` mit notwendiger Umformulierung

Begruendung:
- Aussage muss auf Ist-Stand angepasst werden: Aktiv/Inaktiv existiert, Delete ist gleichzeitig API-seitig deaktiviert.
- Korrekte Testaussage: Aktiv/Inaktiv ist eigener Lifecycle-Pfad und ersetzt keinen physischen Delete, da Delete derzeit blockiert ist.

Referenzen:
- `server/routes/employeesRoutes.ts:12`
- `server/routes/employeesRoutes.ts:13`
- `tests/integration/server/ft05.full-uc-coverage.integration.test.ts:269`

### IT-E-06 - Tour/Team-Zuordnung: Mitarbeiter kann nur einer Tour angehoeren

Status: `vorhanden/abgedeckt`

Begruendung:
- Reassign-Verhalten Tour A -> Tour B ist bereits als Integrationstest abgesichert.

Referenz:
- `tests/integration/server/ft04.employee-tour-relationship.integration.test.ts:91`

### IT-E-07 - Optimistic Locking bei Employee-Mutationen

Status: `vorhanden/abgedeckt`

Begruendung:
- Konkurrenzfall mit stale Version und erwarteter `409 VERSION_CONFLICT` ist vorhanden.

Referenz:
- `tests/integration/server/employees.lifecycle.ft05.integration.test.ts:230`

## Bereinigte Ziel-Testliste (finale Empfehlung, Ist-konform)

1. Employee Create minimaler Happy Path (`201` + Read-back ueber Detail/Liste).
2. Employee Update Happy Path (`200`, persistierte Aenderung, Version +1).
3. Employee Optimistic Locking (`409 VERSION_CONFLICT` bei stale Version).
4. Tour-Einzelzuordnung/Neuzuordnung (Mitarbeiter effektiv nur in einer Tour gleichzeitig).
5. Delete-Policy-Test statt physischem Delete-Test:
   - ADMIN: `DELETE /api/employees/:id` -> `405 METHOD_NOT_ALLOWED`
   - Unberechtigt: `DELETE /api/employees/:id` -> `403 FORBIDDEN`
6. Aktiv/Inaktiv-Semantik als separater Lifecycle-Test (nicht als Delete-Ersatz).

## Nicht passende Vorschlaege (verwerfen oder umschreiben)

- Verwerfen in aktueller Form:
  - IT-E-03 (physischer Delete erfolgreich)
  - IT-E-04 (Delete-Abhaengigkeitsblocker als API-Hauptverhalten)
- Umschreiben:
  - IT-E-05 auf die reale Delete-Policy (`405`) und getrennte Aktiv/Inaktiv-Logik.

## Risiken und Hinweise

1. Risiko Fehlinterpretation: Der interne Servicepfad mit `BUSINESS_CONFLICT` kann mit dem aktiven API-Verhalten verwechselt werden.
2. Risiko Redundanz: Teile der Abdeckung liegen in mehreren FT05-Integrationssuiten vor; bei kuenftiger Pflege auf doppelte Assertions achten.

## Abschluss

Ergebnis: Die vorgeschlagene Liste ist teilweise korrekt, aber bei Delete-Themen in zentralen Punkten nicht codekonform zum aktuellen Ist-Stand.

Die finale Ziel-Testliste oben ist auf den aktuell aktiven Codepfad abgestimmt, ohne neue Architekturannahmen einzufuehren.
