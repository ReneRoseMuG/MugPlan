# UC 33/04: Abwesenheit lÃ¶schen

## Metadaten

- Feature: [FT (33): Abwesenheiten Ã¼ber interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Abwesenheit eines Mitarbeiters entfernen

## Vorbedingungen

Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur wÃ¤hlt eine bestehende Abwesenheit im Tab **Abwesenheiten** und bestÃ¤tigt das LÃ¶schen
2. System prÃ¼ft Berechtigung und Version
3. System lÃ¶scht den zugrunde liegenden Termin

## Alternativen

Versionskonflikt â†’ System meldet Konflikt, Akteur lÃ¤dt neu

## Ergebnis

Abwesenheit ist gelÃ¶scht. Mitarbeiter ist im Zeitraum wieder verfÃ¼gbar.

