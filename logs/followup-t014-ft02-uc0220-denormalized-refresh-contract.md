# Follow-up T-014: FT02 UC 02/20 - Denormalized Refresh Contract

Datum: 2026-02-26  
Bezug: `T-014` aus `logs/audit-report.md`

## Status

Umgesetzt.

## Problemzusammenfassung

UC 02/20 war als eigener Vertragspunkt zur denormalisierten Aktualisierung gefuehrt und scheiterte zuvor mit `NOT_IMPLEMENTED_BY_SCOPE`.

Fachliche Soll-Erwartung:

- Denormalisierte Daten sollen ueber Ansichten hinweg konsistent und nachweisbar aktualisiert werden.

Vorheriger Ist-Zustand:

- Bestehende Projektionen zeigten Teilverhalten, lieferten aber keinen expliziten Backend-Nachweis fuer den separaten UC-02/20-Vertrag.

## Umsetzung

UC 02/20 wurde in `tests/integration/server/ft02.full-uc-coverage.integration.test.ts` von einem Blocker in einen echten Integrationsnachweis ueberfuehrt:

1. Additiver Backend-Contract:
   - Appointment-Projektionen liefern zusaetzlich `projectVersion`.
   - Betroffene Projection-Surfaces: Kalender- und Sidebar-/Entity-Appointment-Responses.
2. UC-02/20-Nachweis:
   - Projekt wird geaendert (`PATCH /api/projects/:id`).
   - Danach werden Kalenderprojektion (`/api/calendar/appointments`) und Projekt-Terminprojektion (`/api/projects/:id/appointments`) erneut gelesen.
   - Verifiziert wird:
     - `projectName` ist aktualisiert,
     - `projectVersion` ist in beiden Projektionen identisch zum aktuellen Detailzustand.

## Ergebnis

Der denormalisierte Refresh-Contract ist jetzt als separater UC-02/20-Nachweis backendseitig reproduzierbar und ohne `NOT_IMPLEMENTED_BY_SCOPE` abgedeckt.
