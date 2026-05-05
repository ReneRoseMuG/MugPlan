# UC 07/11: Termin im CalDAV-Kalender löschen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System

## Ziel

Externes Event entfernen.

Vorbedingungen:

- Termin wird intern gelöscht.
- external_event_id ist vorhanden.

## Vorbedingungen


## Ablauf

- System sendet HTTP DELETE an Event-URL.
- external_event_id wird entfernt.
- Logeintrag wird erstellt.

## Alternativen

- Event nicht auffindbar → Fehler protokollieren, intern fortfahren.

## Ergebnis

Termin ist extern nicht mehr sichtbar.
