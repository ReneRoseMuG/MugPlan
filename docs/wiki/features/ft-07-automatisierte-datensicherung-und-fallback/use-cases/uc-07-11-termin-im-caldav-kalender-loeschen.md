# UC 07/11: Termin im CalDAV-Kalender lÃ¶schen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)
- Notion-Quelle: https://app.notion.com/p/8ed9ebce7bd1439592e891b51a433b8a
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System

## Ziel

Externes Event entfernen.

Vorbedingungen:

- Termin wird intern gelÃ¶scht.
- external_event_id ist vorhanden.

## Vorbedingungen

Nicht angegeben in der Notion-Quelle.

## Ablauf

- System sendet HTTP DELETE an Event-URL.
- external_event_id wird entfernt.
- Logeintrag wird erstellt.

## Alternativen

- Event nicht auffindbar â†’ Fehler protokollieren, intern fortfahren.

## Ergebnis

Termin ist extern nicht mehr sichtbar.

