# Follow-up T-012: FT02 UC 02/12 - Cross-View Source-of-Truth

Datum: 2026-02-26  
Bezug: `T-012` aus `logs/audit-report.md`

## Status

Umgesetzt.

## Problemzusammenfassung

Der Testfall zu **UC 02/12** war als Soll-vs-Ist-Nachweis rot (`NOT_IMPLEMENTED_BY_SCOPE`).

Fachliche Soll-Erwartung:

- Mehrere Ansichten sollen nachweisbar dieselbe serverseitige Datenquelle verwenden.
- Es darf kein lokales, voneinander abweichendes Persistieren/Spiegeln von Projektdaten geben.

Vorheriger Ist-Zustand:

- Der aktuelle Backend-Vertrag liefert dafuer keinen direkten technischen Nachweis-Endpunkt.
- Die vorhandenen Projektionen sind fachlich hilfreich, erlauben aber keinen expliziten Invarianzbeweis fuer UC 02/12.

## Umsetzung

UC 02/12 wurde in `tests/integration/server/ft02.full-uc-coverage.integration.test.ts` von einem Blocker in einen echten Integrationsnachweis ueberfuehrt:

1. Projektdetail-Aggregat (`GET /api/projects/:id`) wird gegen die dedizierten Endpunkte abgeglichen:
   - `/api/projects/:id/statuses`
   - `/api/projects/:id/notes`
   - `/api/projects/:id/attachments`
   - `/api/projects/:id/appointments?fromDate=1900-01-01`
2. Verifiziert werden identische ID-Mengen je Teilbereich.

## Ergebnis

Der Nachweis fuer Source-of-Truth ist jetzt backendseitig reproduzierbar und ohne `NOT_IMPLEMENTED_BY_SCOPE` abgedeckt.
