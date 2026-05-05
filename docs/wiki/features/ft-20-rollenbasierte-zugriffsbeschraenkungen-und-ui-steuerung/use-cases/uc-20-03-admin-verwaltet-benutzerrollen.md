# UC 20/03: Admin verwaltet Benutzerrollen

## Metadaten

- Feature: [FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung](../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md)

## Akteur

Admin

## Ziel

Die Rolle eines bestehenden Benutzers ändern.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Der zu ändernde Benutzer existiert.
- Mindestens ein Admin bleibt im System erhalten.

## Ablauf

1. Akteur öffnet die Benutzerverwaltung.
2. Akteur wählt einen Benutzer aus.
3. Akteur wählt eine neue Rolle.
4. Das System prüft, ob durch die Änderung kein letzter Admin entfernt wird.
5. Das System speichert die neue Rolle.
6. Das System macht die neue Rolle unmittelbar wirksam.

## Alternativen

- Der zu ändernde Benutzer existiert nicht → System antwortet mit 404.
- Die Änderung würde den letzten Admin entfernen → System blockiert mit 409.
- Der Akteur besitzt keine Admin-Rolle → System blockiert mit 403.

## Ergebnis

Die neue Rolle ist persistiert.

Die Berechtigungen des betroffenen Benutzers ändern sich entsprechend.
