# UC 07/06: Backup herunterladen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

Administrator

## Ziel

Herunterladen eines gespeicherten Backups.


## Vorbedingungen

- Backup-Datei existiert serverseitig.

## Ablauf

- Admin doppelklickt auf einen Eintrag.
- System prüft Berechtigung.
- System liefert Datei über geschützten Endpoint aus.

## Alternativen

- Datei nicht vorhanden → Fehlermeldung anzeigen.

## Ergebnis

Backup-Datei wird lokal gespeichert.
