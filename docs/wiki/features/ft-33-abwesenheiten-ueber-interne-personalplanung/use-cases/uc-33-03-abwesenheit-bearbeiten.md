# UC 33/03: Abwesenheit bearbeiten

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Art, Zeitraum oder Notiz einer bestehenden Abwesenheit ändern

## Vorbedingungen

Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur öffnet eine bestehende Abwesenheit im Tab **Abwesenheiten**
2. Akteur ändert Art, Zeitraum oder Notiz
3. System aktualisiert den zugrunde liegenden Termin
4. System entfernt den bisherigen Abwesenheits-Tag und setzt den neuen
5. System prüft Version und Ãœberschneidungen
6. System speichert die Ã„nderung

## Alternativen

Versionskonflikt → System meldet Konflikt, Akteur lädt neu. Ãœberschneidung → System blockiert und meldet Konflikt.

## Ergebnis

Abwesenheit ist mit den geänderten Werten gespeichert

