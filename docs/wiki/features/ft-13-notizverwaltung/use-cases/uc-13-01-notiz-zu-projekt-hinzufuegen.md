# UC 13/01: Notiz zu Projekt hinzufÃ¼gen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Eine neue Notiz erstellen und einem Projekt zuordnen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Projektnotizen.

## Ablauf

1. Der Akteur Ã¶ffnet die Projektdetailansicht.
2. Der Akteur wÃ¤hlt â€žNotiz hinzufÃ¼gen".
3. Das System Ã¶ffnet einen Richtext-Editor.
4. Optional zeigt das System aktive Vorlagen an.
5. WÃ¤hlt der Akteur eine Vorlage, Ã¼bernimmt das System Titel und Inhalt.
6. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), Ã¼bernimmt das System diese einmalig.
7. Der Akteur erfasst oder Ã¤ndert Titel und Beschreibung.
8. Der Akteur bestÃ¤tigt.
9. Das System validiert Pflichtfelder.
10. Das System persistiert die Notiz mit Projektreferenz.
11. Das System aktualisiert die Notizenliste.

## Alternativen

- Pflichtfelder fehlen â†’ Validierungsfehler.
- Abbruch â†’ keine Persistenz.

## Ergebnis

Die Notiz ist persistent gespeichert und projektbezogen referenziert.

