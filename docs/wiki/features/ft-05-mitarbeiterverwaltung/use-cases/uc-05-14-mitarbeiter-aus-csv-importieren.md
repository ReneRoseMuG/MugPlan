# UC 05/14: Mitarbeiter aus CSV importieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Der Administrator lÃ¤dt eine CSV-Datei mit Mitarbeiterdaten hoch. Das System importiert die Mitarbeiter und weist auf Duplikate hin, die nicht Ã¼bernommen werden.

## Vorbedingungen

- Der Administrator ist angemeldet
- Eine CSV-Datei mit Mitarbeiterdaten liegt vor (Spalten: Vorname, Nachname)
- Der Administrator hat explizit entschieden: "Mitarbeiter-Import"

## Ablauf

1. Der Administrator Ã¶ffnet den Import-Bereich und wÃ¤hlt "Mitarbeiter-Import aus CSV"
2. Der Administrator lÃ¤dt die CSV-Datei hoch
3. Das System liest die Datei ein und prÃ¼ft das Format (Spalten: Vorname, Nachname vorhanden?)
4. Das System fÃ¼hrt pro Zeile eine Duplikat-PrÃ¼fung durch: Existiert die Kombination Vorname+Nachname bereits?
5. Das System unterteilt die Zeilen in zwei Gruppen: "Ã¼bernehmbar" und "Duplikat erkannt"
6. Das System importiert alle "Ã¼bernehmbar"-Zeilen in die Mitarbeitertabelle
7. Das System erzeugt einen Import-Report mit:
    - Summe: X Mitarbeiter importiert, Y Duplikate ausgelassen
    - Detail: Auflistung aller Zeilen mit Duplikat-Fehler (Vorname, Nachname, Grund: "Bereits vorhanden")
8. Das System zeigt den Report dem Administrator

## Alternativen

- Die CSV ist nicht lesbar oder verletzt das Format (Spalten fehlen) â†’ System bricht ab und zeigt Fehlermeldung, kein Import
- Alle Zeilen sind Duplikate â†’ System importiert nichts, Report zeigt: "0 importiert, X Duplikate"
- Administrator bricht den Upload ab â†’ Kein Import, kein Report

## Ergebnis

Neue Mitarbeiter sind in der Mitarbeitertabelle angelegt. Duplikate wurden nicht Ã¼bernommen. Ein Import-Report ist verfÃ¼gbar mit Summe und Fehlerdetails.

