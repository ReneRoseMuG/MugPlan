# UC 07/08: Termin in externen Kalender übertragen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System

## Ziel

Neuen Termin im externen Kalender anlegen.


## Vorbedingungen

- Termin wurde neu erstellt.
- Externer Kalender ist konfiguriert.

## Ablauf

- System erzeugt Event-Daten aus Termin.
- System sendet Event an Kalender-API.
- Externe Event-ID wird gespeichert.
- Status wird protokolliert.

## Alternativen

- API nicht erreichbar → Fehler wird protokolliert.

## Ergebnis

Termin ist im externen Kalender sichtbar.
