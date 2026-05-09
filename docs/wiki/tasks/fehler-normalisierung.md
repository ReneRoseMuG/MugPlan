# Fehler-Normalisierung

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message. Die technische Grundlage ist umgesetzt und wartet auf die erste manuelle Prüfung in einem angebundenen Domain-Dialog.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `in Bearbeitung` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message. Diese Aufgabe muss fertig sein, bevor Domain-Objekt-Tasks beginnen.

## Ausgangslage

Bestehende Komponenten werten Server-Fehlercodes bisher lokal und uneinheitlich aus. Für den Dialog-Rollout braucht es eine zentrale, wiederverwendbare Normalisierung, die aktuelle API-Fehlerformate wie `409: {"code":"VERSION_CONFLICT"}` erkennt und keine Rohcodes in Nutzertexte durchreicht.

## Umfang

- Eine zentrale Normalisierung liegt in `client/src/lib/error-normalization.ts`.
- Bekannte Server-Fehlercodes werden auf deutsche Titel, Beschreibungen und Schweregrade gemappt.
- Status-Fallbacks für strukturlose Antworten sind für typische Fälle wie `403`, `404` und `422` abgedeckt.
- Nicht Teil der Aufgabe ist die Entscheidung, ob ein Fehler als Toast, Dialog oder Inline-Meldung angezeigt wird.

## Umsetzungshinweise

- Die Unit-Tests liegen in `tests/unit/lib/error-normalization.test.ts`.
- Die Tests decken bekannte Codes, Query-Client-Fehlerstrings, verschachtelte Payloads, Status-Fallbacks und unbekannte Rohcodes ab.
- Rollenbezug: Die Aufgabe ändert keine Sichtbarkeit, keine Aktion und keinen Endpunkt; spätere Dialoge müssen ihre bestehenden serverseitigen Berechtigungen unverändert durchsetzen.

## Blocker und offene Fragen

- Die manuelle App-Prüfung steht noch aus, weil noch kein Domain-Dialog auf die neue Normalisierung umgestellt wurde.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
