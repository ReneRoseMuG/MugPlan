# Follow-up T-013: FT02 UC 02/19 - Cross-View Contract (Traceability)

Datum: 2026-02-26  
Bezug: `T-013` aus `logs/audit-report.md`

## Problemzusammenfassung

UC 02/19 ist als separater Traceability-Eintrag gefuehrt und faellt aktuell mit `NOT_IMPLEMENTED_BY_SCOPE`.

Fachliche Soll-Erwartung:

- Der Cross-View-Contract soll serverseitig explizit und reproduzierbar nachweisbar sein.

Ist-Zustand:

- Die vorhandenen Endpunkte liefern keinen direkten, dedizierten Nachweis fuer diesen separaten Traceability-Punkt.

## Warum der Test scheitert

Der Test markiert keinen Zufallsfehler, sondern eine offene vertragliche Luecke zwischen Soll-Traceability und Ist-API-Nachweisbarkeit.

## Offene Entscheidung

Der UC-02/19-Nachweis muss entweder:

1. durch einen dedizierten Backend-Nachweisweg ergaenzt werden, oder
2. als nicht-backendseitiger Nachweis in der Scope-Definition klar abgegrenzt werden.

