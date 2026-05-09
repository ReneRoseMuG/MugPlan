# UC 04/07: Wochenübersicht nach Touränderung korrekt ableiten

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent

## Ziel

Mitarbeiter- und tourbezogene Wochenübersichten aus den aktuellen Tour- und Mitarbeiterdaten korrekt ableiten.

## Vorbedingungen

- Termine mit Tour- oder Mitarbeiterbezug sind vorhanden.
- Mindestens eine relevante Kalenderwoche existiert.
- Der Akteur darf die Wochenübersicht sehen.

## Ablauf

1. Der Akteur ruft die Wochenübersicht auf.
2. Das System ermittelt Termine und leitet Touren und Mitarbeiter pro Woche ab.
3. Der Akteur ändert eine Tour.
4. Das System speichert die Änderung.
5. Das System aktualisiert die Wochenübersicht.
6. Das System entfernt oder ergänzt Mitarbeiterzuordnungen korrekt.
7. Leere Wochen bleiben leer.

## Alternativen

- Keine Termine vorhanden: Das System zeigt eine leere Übersicht.
- Abbruch der Touränderung: Die Wochenübersicht bleibt unverändert.

## Ergebnis

Die Wochenübersicht ist konsistent zur aktuellen Tour- und Mitarbeiterlage. Der Use Case ist rein informativ und ändert selbst keine Daten.
