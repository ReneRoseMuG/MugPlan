# UC 04/10: Löschkonflikt bei paralleler Terminzuordnung

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine Tour nicht löschen, wenn ihr parallel ein Termin zugeordnet wird.

## Vorbedingungen

- Die Tour existiert.
- Der Tour sind zunächst keine Termine zugeordnet.
- Zwei berechtigte Akteure arbeiten parallel.

## Ablauf

1. Akteur A initiiert die Löschung der Tour.
2. Akteur B ordnet der Tour parallel einen Termin zu.
3. Das System prüft beim Löschen erneut, ob Termine vorhanden sind.
4. Das System erkennt die neue Terminzuordnung.
5. Das System blockiert die Löschung.

## Alternativen

- Die Löschung ist bereits abgeschlossen, bevor Akteur B speichert: Die Terminzuordnung schlägt fehl.
- Akteur A bricht die Löschung ab: Die Tour bleibt erhalten.

## Ergebnis

Eine Tour mit Terminreferenz wird nicht gelöscht. Verwaiste Terminreferenzen entstehen nicht.
