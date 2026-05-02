# UC 07/06: Backup herunterladen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../feature.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

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
- System prüft Berechtigung.
- System liefert Datei über geschützten Endpoint aus.

## Alternativen

- Datei nicht vorhanden → Fehlermeldung anzeigen.

## Ergebnis

Backup-Datei wird lokal gespeichert.
