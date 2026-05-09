# UC 04/06: Kalenderdarstellung nach Touränderung aktualisieren

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Änderungen an einer Tour in Kalenderansichten sichtbar machen.

## Vorbedingungen

- Die Tour existiert.
- Der Tour sind Termine zugeordnet.
- Der Akteur ist berechtigt.

## Ablauf

1. Der Akteur bearbeitet eine Tour.
2. Der Akteur ändert Farbe oder Mitarbeiterliste.
3. Der Akteur bestätigt die Änderung.
4. Das System speichert die Änderung.
5. Das System aktualisiert die Kalenderansichten.
6. Das System stellt sicher, dass Termine dieser Tour die neue Farbe verwenden.
7. Das System lässt die Terminzuordnungen unverändert.
8. Andere Touren und tourlose Termine bleiben unverändert.

## Alternativen

- Abbruch durch den Akteur: Es wird keine Änderung gespeichert.
- Tour ohne Termine: Die Änderung ist gespeichert, erzeugt aber keine sichtbare Terminänderung.

## Ergebnis

Termine der Tour werden konsistent mit der aktuellen Tourfarbe dargestellt. Andere Termine bleiben unverändert.
