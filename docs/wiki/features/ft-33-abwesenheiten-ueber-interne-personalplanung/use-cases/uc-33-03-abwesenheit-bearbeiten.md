# UC 33/03: Abwesenheit bearbeiten

## Metadaten

- Feature: [FT (33): Abwesenheiten Ã¼ber interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Art, Zeitraum oder Notiz einer bestehenden Abwesenheit Ã¤ndern

## Vorbedingungen

Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur Ã¶ffnet eine bestehende Abwesenheit im Tab **Abwesenheiten**
2. Akteur Ã¤ndert Art, Zeitraum oder Notiz
3. System aktualisiert den zugrunde liegenden Termin
4. System entfernt den bisherigen Abwesenheits-Tag und setzt den neuen
5. System prÃ¼ft Version und Ãœberschneidungen
6. System speichert die Ã„nderung

## Alternativen

Versionskonflikt â†’ System meldet Konflikt, Akteur lÃ¤dt neu. Ãœberschneidung â†’ System blockiert und meldet Konflikt.

## Ergebnis

Abwesenheit ist mit den geÃ¤nderten Werten gespeichert

