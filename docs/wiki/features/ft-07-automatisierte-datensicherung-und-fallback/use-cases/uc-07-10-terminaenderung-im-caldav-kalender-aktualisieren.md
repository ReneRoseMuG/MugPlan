# UC 07/10: TerminÃ¤nderung im CalDAV-Kalender aktualisieren

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System

## Ziel

Externen Kalender an geÃ¤nderten Termin anpassen.

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

- Event extern nicht vorhanden â†’ Event wird neu angelegt.

## Ergebnis

Externer Kalender entspricht internem Stand.

