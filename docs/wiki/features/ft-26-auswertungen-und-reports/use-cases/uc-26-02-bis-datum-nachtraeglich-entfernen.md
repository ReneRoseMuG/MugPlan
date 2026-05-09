# UC 26/02: Bis Datum nachträglich entfernen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)

## Akteur

Disponent, Administrator

## Ziel

Ein gesetztes Bis Datum entfernen und den Report ohne obere Grenze neu erzeugen.

## Vorbedingungen

- Das Bis Datum ist sichtbar und enthält einen Wert.

## Ablauf

1. Der Akteur leert das Feld „Bis Datum“.
2. Der Akteur klickt auf „Report erzeugen“.
3. Das System erzeugt den Report ab dem Von Datum ohne obere Datumsgrenze.

## Alternativen

Keine.

## Ergebnis

Der Report zeigt alle passenden Termine ab dem Von Datum ohne Bis Datum.
