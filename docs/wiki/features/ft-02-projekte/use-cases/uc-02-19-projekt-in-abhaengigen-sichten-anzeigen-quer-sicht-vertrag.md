# UC 02/19: Projekt in abhängigen Sichten anzeigen (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt dargestellt werden.

## Vorbedingungen

- Projekt existiert.
- Projekt wird in mindestens einer abhängigen Sicht verwendet (z. B. Terminliste, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte gemäÃŸ seiner Rolle.

## Ablauf

1. Eine abhängige Sicht lädt Termine oder Listen mit Projektbezug.
2. System stellt sicher, dass Projektdaten nicht lokal dupliziert oder eigenständig persistiert werden.
3. Die Sicht bezieht Projektdaten ausschlieÃŸlich über die gültige Projektquelle.
4. Die Darstellung erfolgt konsistent zur Projekt-Detailansicht.

## Alternativen

- Projekt wurde gelöscht → Referenz darf nicht mehr angezeigt werden.
- Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.

## Ergebnis

Alle abhängigen Sichten zeigen identische Projektdaten.

Es existieren keine widersprüchlichen Projektrepräsentationen im System.

