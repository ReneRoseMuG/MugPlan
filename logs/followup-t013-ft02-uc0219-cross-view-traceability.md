# Follow-up T-013: FT02 UC 02/19 - Cross-View Contract (Traceability)

Datum: 2026-02-26  
Bezug: `T-013` aus `logs/audit-report.md`

## Status

Umgesetzt.

## Problemzusammenfassung

UC 02/19 war als separater Traceability-Eintrag gefuehrt und fiel mit `NOT_IMPLEMENTED_BY_SCOPE`.

Fachliche Soll-Erwartung:

- Der Cross-View-Contract soll serverseitig explizit und reproduzierbar nachweisbar sein.

Vorheriger Ist-Zustand:

- Die vorhandenen Endpunkte liefern keinen direkten, dedizierten Nachweis fuer diesen separaten Traceability-Punkt.

## Umsetzung

UC 02/19 wurde in `tests/integration/server/ft02.full-uc-coverage.integration.test.ts` als echter Traceability-Nachweis umgesetzt:

1. Mutationen ueber dedizierte Endpunkte (Projektname, Status-Relation, Notizen) werden ausgefuehrt.
2. Danach wird das Detail-Aggregat gelesen und gegen dedizierte Endpunkte abgeglichen.
3. Verifiziert wird:
   - geaenderter Projektname ist in Aggregat und Terminprojektion sichtbar,
   - entfernte Status-/Notiz-Objekte sind in allen Quellen konsistent entfernt,
   - Terminliste bleibt mit dediziertem Endpoint deckungsgleich.

## Ergebnis

Der separate Traceability-Punkt ist nun backendseitig explizit und reproduzierbar nachgewiesen.
