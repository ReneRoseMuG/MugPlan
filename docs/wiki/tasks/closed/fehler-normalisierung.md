# Fehler-Normalisierung

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message. Die Grundlage wurde mit dem ersten echten Domain-Dialog erfolgreich bestätigt.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message.

## Ausgangslage

Bestehende Komponenten werteten Server-Fehlercodes lokal und uneinheitlich aus. Für den Dialog-Rollout wurde eine zentrale, wiederverwendbare Normalisierung benötigt, die aktuelle API-Fehlerformate wie `409: {"code":"VERSION_CONFLICT"}` erkennt und keine Rohcodes in Nutzertexte durchreicht.

## Umfang

- Die zentrale Normalisierung liegt in `client/src/lib/error-normalization.ts`.
- Bekannte Server-Fehlercodes werden auf deutsche Titel, Beschreibungen und Schweregrade gemappt.
- Status-Fallbacks für strukturlose Antworten sind für typische Fälle wie `403`, `404` und `422` abgedeckt.
- Nicht Teil der Aufgabe ist die Entscheidung, ob ein Fehler als Toast, Dialog oder Inline-Meldung angezeigt wird.

## Umsetzungshinweise

- Die Unit-Tests liegen in `tests/unit/lib/error-normalization.test.ts`.
- Die Tests decken bekannte Codes, Query-Client-Fehlerstrings, verschachtelte Payloads, Status-Fallbacks und unbekannte Rohcodes ab.
- Die Normalisierung wurde im Team-Domain-Dialog angebunden und dort als Teil der ersten P01-Domain-Umsetzung geprüft.
- Rollenbezug: Die Aufgabe ändert keine Sichtbarkeit, keine Aktion und keinen Endpunkt; die späteren Dialoge müssen ihre bestehenden serverseitigen Berechtigungen unverändert durchsetzen.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Die zentrale Fehler-Normalisierung ist umgesetzt und im ersten echten Domain-Dialog nutzbar.
- Automatisierte Verifikation: `tests/unit/lib/error-normalization.test.ts` sowie die Teams-Dialog-Suite aus der ersten P01-Domain-Umsetzung.
- App-Prüfung: Die Prüfung des Team-Dialogs hat die Nutzung der normalisierten Meldungspfade als Teil des Dialog-Piloten bestätigt.
- Verwendete Testdaten: synthetische Fehlerpayloads, strukturlose HTTP-Fehler und FT-11-Testfixtures aus der Team-Domain-Suite.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern.
- Verbleibende Lücken: Keine für diese Grundlagenaufgabe; weitere Domain-Dialoge müssen die Normalisierung jeweils erneut fachlich anbinden und testen.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](../dialog-rollout-masterplan.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Fehler-Normalisierung abgeschlossen](../../journal/09-05-26-p01-fehler-normalisierung-abgeschlossen.md)
