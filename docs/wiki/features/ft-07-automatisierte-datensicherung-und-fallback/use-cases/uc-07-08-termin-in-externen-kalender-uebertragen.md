# UC 07/08: Termin in externen Kalender übertragen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../feature.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

System

## Ziel

Neuen Termin im externen Kalender anlegen.

Vorbedingungen:

- Termin wurde neu erstellt.
- Externer Kalender ist konfiguriert.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- System erzeugt Event-Daten aus Termin.
- System sendet Event an Kalender-API.
- Externe Event-ID wird gespeichert.
- Status wird protokolliert.

## Alternativen

- API nicht erreichbar → Fehler wird protokolliert.

## Ergebnis

Termin ist im externen Kalender sichtbar.
