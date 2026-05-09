# UC 04/09: Parallele Bearbeitung derselben Tour

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Stille Überschreibungen bei paralleler Bearbeitung derselben Tour verhindern.

## Vorbedingungen

- Die Tour existiert.
- Zwei berechtigte Akteure bearbeiten dieselbe Tour gleichzeitig.

## Ablauf

1. Akteur A öffnet die Tour.
2. Akteur B öffnet dieselbe Tour.
3. Akteur A ändert die Farbe und speichert.
4. Das System speichert die Änderung und erhöht die Version.
5. Akteur B speichert auf Basis des alten Versionsstands.
6. Das System erkennt den Versionskonflikt und blockiert die Speicherung.

## Alternativen

- Akteur B speichert zuerst: Akteur A erhält bei späterem Speichern den Versionskonflikt.
- Einer der Akteure bricht ab: Es wird nur die bestätigte Änderung gespeichert.

## Ergebnis

Keine Änderung überschreibt still eine andere. Die Tour bleibt in einem konsistenten Zustand.
