# UC 14/01: Benutzer anlegen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Einen neuen Benutzer mit einer gültigen Rolle im System anlegen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Es existiert mindestens ein weiterer Admin im System.

## Ablauf

1. Der Akteur öffnet die Benutzerverwaltung.
2. Der Akteur wählt die Funktion „Benutzer anlegen“.
3. Das System zeigt ein Formular zur Erfassung der Benutzerdaten an.
4. Der Akteur erfasst die erforderlichen Stammdaten.
5. Der Akteur wählt eine Rolle aus (Leser, Disponent oder Admin).
6. Der Akteur speichert.
7. Das System prüft die Admin-Berechtigung serverseitig.
8. Das System validiert die Eingaben.
9. Das System persistiert den Benutzer mit der gewählten Rolle.

## Alternativen

- Der Akteur besitzt keine Admin-Rolle → System antwortet mit 403.
- Pflichtfelder fehlen → System lehnt ab und speichert nicht.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

Ein neuer Benutzer existiert persistent mit genau einer Rolle.
