# UC 26/05: Produktionsplanung drucken

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)

## Akteur

Disponent, Administrator

## Ziel

Aus einem generierten Report eine Druckausgabe im Querformat DIN A4 mit Summenreport, Vorlaufliste und Projektzeilen erzeugen.

## Vorbedingungen

- Der Produktionsplanungs-Report wurde erzeugt.
- Das Report-Overlay ist geöffnet.

## Ablauf

1. Der Akteur klickt auf „Produktionsplanung drucken“.
2. Das System erzeugt die Druckausgabe anhand der aktuellen Parameter für Zeitraum, Kategorie-Layout und Shortcodes.
3. Das System rendert den Summenreport.
4. Das System rendert die Vorlaufliste mit einer Zeile pro Projekt, Index, ohne Kundendaten, Tourname und Shortcodes, sofern diese aktiv sind.
5. Das System rendert Projektzeilen für Sondermaß, Anmerkungen und Gespiegelt als Karten mit Header, Beschreibung und Footer.
6. Das System öffnet den Browser-Druckdialog.

## Alternativen

- Für einen Bereich gibt es keine passenden Daten: Das System zeigt dort einen Leerhinweis und rendert die übrigen Bereiche weiter.

## Ergebnis

Die Produktionsplanung kann gedruckt oder als PDF gespeichert werden. Stornierungen und Reklamationen sind ausgeschlossen.
