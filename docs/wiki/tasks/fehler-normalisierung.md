# Fehler-Normalisierung

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message. Diese Aufgabe muss fertig sein, bevor Domain-Objekt-Tasks beginnen. Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Zentrale clientseitige Mapping-Schicht für bekannte Server-Fehlercodes (`VERSION_CONFLICT`, `EMPLOYEE_OVERLAP_CONFLICT`, `PAST_APPOINTMENT_READONLY`, `PAST_WEEK_READONLY`, `BUSINESS_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`). Sie liefert verständliche deutsche Nutzertexte, entscheidet aber nicht selbst über Toast, Dialog oder Inline-Message. Diese Aufgabe muss fertig sein, bevor Domain-Objekt-Tasks beginnen.

## Ausgangslage

Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

## Umfang

- Der konkrete Umfang ist noch zu konkretisieren.

## Umsetzungshinweise

- Die Umsetzungshinweise sind noch zu konkretisieren.

## Blocker und offene Fragen

Keine bekannt.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
