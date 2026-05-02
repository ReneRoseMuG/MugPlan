# UC 33/04: Abwesenheit löschen

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Abwesenheit eines Mitarbeiters entfernen

## Vorbedingungen

Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur wählt eine bestehende Abwesenheit im Tab **Abwesenheiten** und bestätigt das Löschen
2. System prüft Berechtigung und Version
3. System löscht den zugrunde liegenden Termin

## Alternativen

Versionskonflikt → System meldet Konflikt, Akteur lädt neu

## Ergebnis

Abwesenheit ist gelöscht. Mitarbeiter ist im Zeitraum wieder verfügbar.
