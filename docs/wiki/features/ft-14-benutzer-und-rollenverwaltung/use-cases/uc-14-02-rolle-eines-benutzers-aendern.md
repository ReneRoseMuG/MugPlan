# UC 14/02: Rolle eines Benutzers Ã¤ndern

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Die Rolle eines bestehenden Benutzers Ã¤ndern.

## Vorbedingungen

- Der Benutzer existiert.
- Der Akteur besitzt die Rolle Admin.
- Es bleibt mindestens ein Admin im System erhalten.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines Benutzers.
2. Der Akteur Ã¤ndert die Rolle.
3. Der Akteur speichert.
4. Das System prÃ¼ft serverseitig die Admin-Berechtigung.
5. Das System prÃ¼ft, ob nach der Ã„nderung mindestens ein Admin verbleibt.
6. Das System persistiert die neue Rolle.

## Alternativen

- Letzter Admin wÃ¼rde entfernt â†’ System blockiert mit 409.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.

## Ergebnis

Die Rolle ist aktualisiert und wirkt systemweit.

