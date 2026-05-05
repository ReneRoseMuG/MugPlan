# UC 07/07: Alte Backups automatisch löschen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System (Scheduler)

## Ziel

Speicherbereinigung gemäß Retention-Regel.

Vorbedingungen:

- Scheduler-Lauf wird ausgeführt.

## Vorbedingungen


## Ablauf

- System prüft gespeicherte Dateien.
- Dateien älter als 30 Tage werden gelöscht.
- Löschvorgang wird protokolliert.

## Alternativen

- Datei nicht auffindbar → Fehler protokollieren.

## Ergebnis

Speicher bleibt kontrolliert, Log bleibt erhalten.
