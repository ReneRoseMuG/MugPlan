# UC 13/01: Notiz zu Projekt hinzufügen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent

## Ziel

Eine neue Notiz erstellen und einem Projekt zuordnen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Projektnotizen.

## Ablauf

1. Der Akteur öffnet die Projektdetailansicht.
2. Der Akteur wählt „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor.
4. Optional zeigt das System aktive Vorlagen an.
5. Wählt der Akteur eine Vorlage, übernimmt das System Titel und Inhalt.
6. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese einmalig.
7. Der Akteur erfasst oder ändert Titel und Beschreibung.
8. Der Akteur bestätigt.
9. Das System validiert Pflichtfelder.
10. Das System persistiert die Notiz mit Projektreferenz.
11. Das System aktualisiert die Notizenliste.

## Alternativen

- Pflichtfelder fehlen → Validierungsfehler.
- Abbruch → keine Persistenz.

## Ergebnis

Die Notiz ist persistent gespeichert und projektbezogen referenziert.

