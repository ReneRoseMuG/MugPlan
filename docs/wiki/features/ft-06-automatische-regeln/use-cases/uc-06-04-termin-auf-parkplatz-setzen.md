# UC 06/04: Termin auf Parkplatz setzen

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

Disponent, Administrator

## Ziel

Einen Termin auf die Systemtour „Parkplatz“ setzen, den Zustand „Geparkt“ setzen und Mitarbeiter entfernen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin liegt noch nicht auf dem Parkplatz.
- Der Termin ist nicht storniert.
- Der Akteur besitzt Schreibrechte.

## Ablauf

1. Der Akteur löst die Aktion „Parken“ aus.
2. Das System fordert eine Bestätigung an.
3. Der Akteur bestätigt die Aktion.
4. Das System ordnet den Termin der Tour „Parkplatz“ zu.
5. Das System setzt den Zustand „Geparkt“.
6. Das System entfernt vorhandene Mitarbeiterzuweisungen.
7. Das System aktualisiert die betroffenen Ansichten.

## Alternativen

- Abbruch durch den Akteur: Der Termin bleibt unverändert.
- Der Termin liegt bereits auf dem Parkplatz: Die Aktion ist nicht verfügbar.

## Ergebnis

Der Termin ist der Tour „Parkplatz“ zugeordnet, trägt den Zustand „Geparkt“ und besitzt keine Mitarbeiterzuweisungen.
