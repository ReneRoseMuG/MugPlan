# UC 02/12: Projekt in abhängigen Sichten anzeigen (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt angezeigt werden.

## Vorbedingungen

- Projekt existiert.
- Projekt ist mindestens einer abhängigen Sicht referenziert (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte.

## Ablauf

1. Eine abhängige Sicht (z. B. Terminliste oder Kalender) lädt ein oder mehrere Termine mit Projektbezug.
2. System stellt sicher, dass projektrelevante Anzeigedaten nicht lokal dupliziert oder eigenständig persistiert werden.
3. Die Sicht bezieht projektrelevante Informationen ausschließlich aus der gültigen Projektquelle.
4. Darstellung erfolgt konsistent mit der Projekt-Detailansicht.

## Alternativen

- Projekt wurde zwischenzeitlich gelöscht → Referenz darf nicht mehr existieren.
- Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.

## Ergebnis

Alle abhängigen Sichten zeigen identische und konsistente Projektdaten.

Es existieren keine widersprüchlichen Projektrepräsentationen zwischen Detailansicht und Quersichten.
