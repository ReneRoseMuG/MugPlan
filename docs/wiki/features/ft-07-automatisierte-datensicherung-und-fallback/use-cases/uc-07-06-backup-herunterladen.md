# UC 07/06: Backup herunterladen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Herunterladen eines gespeicherten Backups.

Vorbedingungen:

- Backup-Datei existiert serverseitig.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- Admin doppelklickt auf einen Eintrag.
- System prÃ¼ft Berechtigung.
- System liefert Datei Ã¼ber geschÃ¼tzten Endpoint aus.

## Alternativen

- Datei nicht vorhanden â†’ Fehlermeldung anzeigen.

## Ergebnis

Backup-Datei wird lokal gespeichert.

