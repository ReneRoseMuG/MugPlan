# Follow-up T-027: Projekt-Detail-Aggregat erweitern

Datum: 2026-02-26  
Bezug: `T-027` aus `logs/audit-report.md`

## Ausgangslage

Der Test `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts` formuliert einen Soll-Contract fuer `GET /api/projects/:id`:

- `project`
- `customer`
- `projectStatuses`
- `projectNotes`
- `projectAttachments`
- `projectAppointments`

Der Ist-Contract liefert aktuell nur:

- `project`
- `customer`

## Warum der Test rot ist

Bewusster Soll-vs-Ist-Nachweis: erwartetes Aggregat ist groesser als aktueller Produktionsvertrag.

## Risiken bei Produktionsaenderung

1. Performance/Last: Mehr Joins, groessere Payload, hoeherer DB- und Netzwerkaufwand.
2. Berechtigung: Gefahr von Datenlecks, wenn Guards von Einzelendpunkten nicht korrekt uebernommen werden.
3. Konsistenz: Mischstaende zwischen Teillisten ohne Snapshot-Strategie moeglich.
4. API-Vertrag: Brechendes Risiko, falls bestehende Felder/Struktur veraendert statt additiv erweitert werden.
5. Caching/Latenz: Schwerere Detailantwort kann UI-Reaktionszeit verschlechtern.

## Empfohlene Leitplanken fuer spaetere Umsetzung

1. Nur additive Erweiterung des bestehenden JSON-Vertrags.
2. Guards/Role-Checks pro Teildatensatz explizit uebernehmen.
3. Response-Felder klar versionieren oder als optional dokumentieren.
4. Performance-Budget definieren (z. B. max. Latenz, max. Query-Anzahl).
5. Integrations- und Lasttests fuer den erweiterten Endpoint einplanen.

## Offene Produktentscheidung

Soll `GET /api/projects/:id` der zentrale Voll-Aggregat-Endpoint werden, oder bleibt die Zerlegung auf spezialisierte Endpunkte (`/notes`, `/attachments`, `/statuses`, `/appointments`) bewusst bestehen?

