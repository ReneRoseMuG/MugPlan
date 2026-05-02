# UC 07/07: Alte Backups automatisch lÃ¶schen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System (Scheduler)

## Ziel

Speicherbereinigung gemÃ¤ÃŸ Retention-Regel.

Vorbedingungen:

- Scheduler-Lauf wird ausgefÃ¼hrt.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- System prÃ¼ft gespeicherte Dateien.
- Dateien Ã¤lter als 30 Tage werden gelÃ¶scht.
- LÃ¶schvorgang wird protokolliert.

## Alternativen

- Datei nicht auffindbar â†’ Fehler protokollieren.

## Ergebnis

Speicher bleibt kontrolliert, Log bleibt erhalten.

