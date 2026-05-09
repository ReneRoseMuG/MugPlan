# UC 26/07: Auftragsliste drucken

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)

## Akteur

Disponent, Administrator

## Ziel

Aus der Auftragsliste eine paginierte Druckausgabe im Querformat DIN A4 erzeugen.

## Vorbedingungen

- Die Auftragsliste wurde erzeugt.

## Ablauf

1. Der Akteur klickt auf „Auftragsliste drucken“.
2. Das System erzeugt eine Druckvorschau anhand der aktuellen Parameter für Zeitraum und Kategorie.
3. Das System zeigt die Ausgabe paginiert im Querformat.
4. Jede Seite enthält so viele Kacheln wie ohne Umbruch passen.
5. Das System verhindert Kachelumbrüche.
6. Das System öffnet den Browser-Druckdialog.

## Alternativen

- Keine Einträge vorhanden: Das System erzeugt eine leere Seite mit Hinweis.

## Ergebnis

Die Auftragsliste kann gedruckt oder als PDF gespeichert werden. Stornierungen und Reklamationen sind vollständig ausgeschlossen.
