# UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System

## Ziel

Externen Kalender an geänderten Termin anpassen.


## Vorbedingungen

- Termin besitzt external_event_id.

## Ablauf

- System erzeugt aktualisierte iCalendar-Daten.
- System sendet HTTP PUT an bestehende Event-URL.
- Status wird aktualisiert.
- Logeintrag wird erstellt.

## Alternativen

- Event extern nicht vorhanden → Event wird neu angelegt.

## Ergebnis

Externer Kalender entspricht internem Stand.
