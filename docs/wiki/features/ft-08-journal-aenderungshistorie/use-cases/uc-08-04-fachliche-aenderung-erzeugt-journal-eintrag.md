# UC 08/04: Fachliche Änderung erzeugt Journal-Eintrag

## Metadaten

- Feature: [FT (08): Journal / Änderungshistorie](../ft-08-journal-aenderungshistorie.md)

## Akteur

Administrator, Disponent

## Ziel

Eine erfolgreiche Mutation automatisch dokumentieren.

## Vorbedingungen

- Eine mutierende Operation auf einer journalisierten Entität wurde erfolgreich abgeschlossen.

## Ablauf

1. Der Akteur speichert eine fachliche Änderung.
2. Das System schreibt einen Journal-Eintrag mit Beschreibung, Akteur und Zeit.
3. Das System ergänzt die relevanten Kontextbezüge.
4. Das System stellt den Eintrag global und in betroffenen Detailansichten bereit.

## Alternativen

Keine.

## Ergebnis

Die fachliche Änderung ist historisch nachvollziehbar.
