# UC 14/04: Letzten Admin schützen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)

## Akteur

Admin

## Ziel

Sicherstellen, dass das System niemals ohne Admin bleibt.

## Vorbedingungen

- Es existiert genau ein Admin.
- Der Akteur versucht, diesen herabzustufen oder zu löschen.

## Ablauf

1. Der Akteur startet die Rollenänderung oder Löschung.
2. Das System prüft die Anzahl verbleibender Admins.
3. Das System erkennt, dass kein weiterer Admin existiert.
4. Das System blockiert die Aktion.
5. Das System antwortet mit 409.

## Alternativen

- Es existieren mehrere Admins → Aktion wird erlaubt.

## Ergebnis

Mindestens ein Admin bleibt im System erhalten.
