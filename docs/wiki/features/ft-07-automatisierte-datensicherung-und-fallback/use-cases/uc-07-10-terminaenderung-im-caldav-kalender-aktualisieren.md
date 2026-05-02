# UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../feature.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

System

## Ziel

Externen Kalender an geänderten Termin anpassen.

Vorbedingungen:

- Termin besitzt external_event_id.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- System erzeugt aktualisierte iCalendar-Daten.
- System sendet HTTP PUT an bestehende Event-URL.
- Status wird aktualisiert.
- Logeintrag wird erstellt.

## Alternativen

- Event extern nicht vorhanden → Event wird neu angelegt.

## Ergebnis

Externer Kalender entspricht internem Stand.
