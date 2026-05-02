# UC 02/19: Projekt in abhÃ¤ngigen Sichten anzeigen (QuerÂ­sicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Projektdaten in allen abhÃ¤ngigen Sichten konsistent und referenziell korrekt dargestellt werden.

## Vorbedingungen

- Projekt existiert.
- Projekt wird in mindestens einer abhÃ¤ngigen Sicht verwendet (z. B. Terminliste, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte gemÃ¤ÃŸ seiner Rolle.

## Ablauf

1. Eine abhÃ¤ngige Sicht lÃ¤dt Termine oder Listen mit Projektbezug.
2. System stellt sicher, dass Projektdaten nicht lokal dupliziert oder eigenstÃ¤ndig persistiert werden.
3. Die Sicht bezieht Projektdaten ausschlieÃŸlich Ã¼ber die gÃ¼ltige Projektquelle.
4. Die Darstellung erfolgt konsistent zur Projekt-Detailansicht.

## Alternativen

- Projekt wurde gelÃ¶scht â†’ Referenz darf nicht mehr angezeigt werden.
- Projekt besitzt keine abhÃ¤ngigen Sichten â†’ Keine weitere Aktion erforderlich.

## Ergebnis

Alle abhÃ¤ngigen Sichten zeigen identische Projektdaten.

Es existieren keine widersprÃ¼chlichen ProjektreprÃ¤sentationen im System.

