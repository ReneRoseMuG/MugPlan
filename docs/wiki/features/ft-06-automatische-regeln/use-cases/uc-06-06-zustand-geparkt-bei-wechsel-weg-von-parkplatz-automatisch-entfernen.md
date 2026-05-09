# UC 06/06: Zustand Geparkt bei Wechsel weg von Parkplatz automatisch entfernen

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

System

## Ziel

Den Zustand „Geparkt“ automatisch entfernen, sobald ein Termin den Parkplatz verlässt.

## Vorbedingungen

- Der Termin ist der Tour „Parkplatz“ zugeordnet.
- Der Termin trägt den Zustand „Geparkt“.
- Die Tourzuordnung wird auf eine andere Tour geändert.

## Ablauf

1. Der Akteur ändert die Tourzuordnung des Termins auf eine reguläre Tour.
2. Das System erkennt, dass der Termin die Tour „Parkplatz“ verlässt.
3. Das System entfernt den Zustand „Geparkt“.
4. Das System speichert die neue Tourzuordnung.

## Alternativen

- Der Termin bleibt auf dem Parkplatz: Der Zustand „Geparkt“ bleibt erhalten.
- Die Änderung wird abgebrochen: Der Termin bleibt unverändert.

## Ergebnis

Der Termin liegt auf einer regulären Tour und trägt den Zustand „Geparkt“ nicht mehr.
