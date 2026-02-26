# Follow-up T-014: FT02 UC 02/20 - Denormalized Refresh Contract

Datum: 2026-02-26  
Bezug: `T-014` aus `logs/audit-report.md`

## Problemzusammenfassung

UC 02/20 ist als eigener Vertragspunkt zur denormalisierten Aktualisierung gefuehrt und scheitert aktuell mit `NOT_IMPLEMENTED_BY_SCOPE`.

Fachliche Soll-Erwartung:

- Denormalisierte Daten sollen ueber Ansichten hinweg konsistent und nachweisbar aktualisiert werden.

Ist-Zustand:

- Bestehende Projektionen zeigen Teilverhalten, liefern aber keinen vollstaendigen, direkten Backend-Nachweis fuer den gesamten UC-02/20-Vertrag.

## Warum der Test scheitert

Der Test zeigt eine Contract-Luecke im Nachweisweg, nicht einen instabilen Laufzeitfehler.

## Offene Entscheidung

Fuer UC 02/20 ist zu entscheiden:

1. dedizierter Nachweis im Backend-Vertrag (Endpoint/Felder/Invariante), oder
2. explizite Scope-Abgrenzung, dass der Vollnachweis nicht serverseitig gefuehrt wird.

