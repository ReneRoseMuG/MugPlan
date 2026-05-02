# UC 02/12: Projekt in abhÃ¤ngigen Sichten anzeigen (QuerÂ­sicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Projektdaten in allen abhÃ¤ngigen Sichten konsistent und referenziell korrekt angezeigt werden.

## Vorbedingungen

- Projekt existiert.
- Projekt ist mindestens einer abhÃ¤ngigen Sicht referenziert (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte.

## Ablauf

1. Eine abhÃ¤ngige Sicht (z. B. Terminliste oder Kalender) lÃ¤dt ein oder mehrere Termine mit Projektbezug.
2. System stellt sicher, dass projektrelevante Anzeigedaten nicht lokal dupliziert oder eigenstÃ¤ndig persistiert werden.
3. Die Sicht bezieht projektrelevante Informationen ausschlieÃŸlich aus der gÃ¼ltigen Projektquelle.
4. Darstellung erfolgt konsistent mit der Projekt-Detailansicht.

## Alternativen

- Projekt wurde zwischenzeitlich gelÃ¶scht â†’ Referenz darf nicht mehr existieren.
- Projekt besitzt keine abhÃ¤ngigen Sichten â†’ Keine weitere Aktion erforderlich.

## Ergebnis

Alle abhÃ¤ngigen Sichten zeigen identische und konsistente Projektdaten.

Es existieren keine widersprÃ¼chlichen ProjektreprÃ¤sentationen zwischen Detailansicht und QuerÂ­sichten.

