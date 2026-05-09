# UC 04/04: Tour löschen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine Tour entfernen, wenn ihr keine Termine zugeordnet sind.

## Beschreibung

Das Löschen einer Tour ist nur zulässig, wenn keine Termine auf diese Tour verweisen. Mitarbeiterzuordnungen der Tour-Kalenderwochen werden zusammen mit der Tour entfernt.

## Vorbedingungen

- Die Tour existiert.
- Der Akteur ist berechtigt.
- Der Tour sind keine Termine zugeordnet.

## Ablauf

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt eine Tour.
3. Der Akteur löst die Löschung aus.
4. Das System prüft erneut, ob Termine auf die Tour verweisen.
5. Das System löscht die Tour.
6. Das System löscht kaskadierend alle Tour-KW-Mitarbeiterzuordnungen.
7. Das System aktualisiert die betroffenen Sichten.

## Alternativen

- Die Tour enthält Termine: Das System blockiert die Löschung, die Tour bleibt erhalten.
- Abbruch durch den Akteur: Es wird nichts gelöscht.

## Ergebnis

Die Tour existiert nicht mehr. Es gibt keine verwaisten Referenzen und die Sichten zeigen die Tour nicht mehr an.
