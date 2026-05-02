# UC 14/01: Benutzer anlegen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Einen neuen Benutzer mit einer gÃ¼ltigen Rolle im System anlegen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Es existiert mindestens ein weiterer Admin im System.

## Ablauf

1. Der Akteur Ã¶ffnet die Benutzerverwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žBenutzer anlegenâ€œ.
3. Das System zeigt ein Formular zur Erfassung der Benutzerdaten an.
4. Der Akteur erfasst die erforderlichen Stammdaten.
5. Der Akteur wÃ¤hlt eine Rolle aus (Leser, Disponent oder Admin).
6. Der Akteur speichert.
7. Das System prÃ¼ft die Admin-Berechtigung serverseitig.
8. Das System validiert die Eingaben.
9. Das System persistiert den Benutzer mit der gewÃ¤hlten Rolle.

## Alternativen

- Der Akteur besitzt keine Admin-Rolle â†’ System antwortet mit 403.
- Pflichtfelder fehlen â†’ System lehnt ab und speichert nicht.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

Ein neuer Benutzer existiert persistent mit genau einer Rolle.

