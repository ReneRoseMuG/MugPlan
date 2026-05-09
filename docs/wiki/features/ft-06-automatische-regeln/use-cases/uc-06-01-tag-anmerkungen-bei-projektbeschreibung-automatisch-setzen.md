# UC 06/01: Tag Anmerkungen bei Projektbeschreibung automatisch setzen

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

System

## Ziel

Projekte mit Beschreibung automatisch mit dem Tag „Anmerkungen“ kennzeichnen.

## Vorbedingungen

- Ein Projekt wird gespeichert.
- Das Projekt enthält eine Beschreibung.
- Der Tag „Anmerkungen“ fehlt am Projekt.

## Ablauf

1. Der Akteur speichert ein Projekt.
2. Das System prüft, ob eine Projektbeschreibung vorhanden ist.
3. Das System prüft, ob der Tag „Anmerkungen“ bereits gesetzt ist.
4. Falls der Tag fehlt, setzt das System ihn automatisch.
5. Das System speichert das Projekt mit aktualisierter Tag-Zuordnung.

## Alternativen

- Keine Beschreibung vorhanden: Das System setzt keinen Tag.
- Der Tag ist bereits vorhanden: Das System nimmt keine zusätzliche Änderung vor.

## Ergebnis

Projekte mit Beschreibung tragen den Tag „Anmerkungen“, ohne dass eine separate Benachrichtigung oder Entscheidung erforderlich ist.
