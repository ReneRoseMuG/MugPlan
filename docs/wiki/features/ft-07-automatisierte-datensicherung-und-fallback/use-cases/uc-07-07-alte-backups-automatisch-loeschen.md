# UC 07/07: Alte Backups automatisch löschen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

System (Scheduler)

## Ziel

Speicherbereinigung gemäÃŸ Retention-Regel.

Vorbedingungen:

- Scheduler-Lauf wird ausgeführt.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- System prüft gespeicherte Dateien.
- Dateien älter als 30 Tage werden gelöscht.
- Löschvorgang wird protokolliert.

## Alternativen

- Datei nicht auffindbar → Fehler protokollieren.

## Ergebnis

Speicher bleibt kontrolliert, Log bleibt erhalten.

