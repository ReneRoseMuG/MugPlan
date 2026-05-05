# UC 14/02: Rolle eines Benutzers ändern

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)

## Akteur

Admin

## Ziel

Die Rolle eines bestehenden Benutzers ändern.

## Vorbedingungen

- Der Benutzer existiert.
- Der Akteur besitzt die Rolle Admin.
- Es bleibt mindestens ein Admin im System erhalten.

## Ablauf

1. Der Akteur öffnet die Detailansicht eines Benutzers.
2. Der Akteur ändert die Rolle.
3. Der Akteur speichert.
4. Das System prüft serverseitig die Admin-Berechtigung.
5. Das System prüft, ob nach der Änderung mindestens ein Admin verbleibt.
6. Das System persistiert die neue Rolle.

## Alternativen

- Letzter Admin würde entfernt → System blockiert mit 409.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.

## Ergebnis

Die Rolle ist aktualisiert und wirkt systemweit.
