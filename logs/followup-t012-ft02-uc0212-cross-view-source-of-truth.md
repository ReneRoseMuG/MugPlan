# Follow-up T-012: FT02 UC 02/12 - Cross-View Source-of-Truth

Datum: 2026-02-26  
Bezug: `T-012` aus `logs/audit-report.md`

## Problemzusammenfassung

Der Testfall zu **UC 02/12** ist bewusst als Soll-vs-Ist-Nachweis rot (`NOT_IMPLEMENTED_BY_SCOPE`).

Fachliche Soll-Erwartung:

- Mehrere Ansichten sollen nachweisbar dieselbe serverseitige Datenquelle verwenden.
- Es darf kein lokales, voneinander abweichendes Persistieren/Spiegeln von Projektdaten geben.

Ist-Zustand:

- Der aktuelle Backend-Vertrag liefert dafuer keinen direkten technischen Nachweis-Endpunkt.
- Die vorhandenen Projektionen sind fachlich hilfreich, erlauben aber keinen expliziten Invarianzbeweis fuer UC 02/12.

## Warum der Test scheitert

Nicht wegen Instabilitaet oder Zufallsfehler, sondern weil die gewuenschte Nachweisbarkeit im Produktvertrag derzeit fehlt.

## Produktentscheidung (offen)

Es ist zu klaeren, wie UC 02/12 formal nachweisbar gemacht werden soll:

1. dedizierter Invarianz-/Readback-Endpunkt, oder
2. vertragliche Erweiterung bestehender Endpunkte mit expliziten Nachweisfeldern, oder
3. bewusste Scope-Entscheidung, dass der Nachweis in dieser Form nicht Teil des Backends ist.

## Empfohlene Leitplanken fuer spaetere Umsetzung

1. Keine Testabschwaechung nur fuer gruenen Lauf.
2. Nachweisbarkeit muss am API-Vertrag haengen, nicht an impliziten UI-Annahmen.
3. Der gewaehlte Nachweisweg muss rollen- und konsistenzsicher sein.
4. Integrations-Test soll den finalen Vertrag eindeutig und reproduzierbar pruefen.

