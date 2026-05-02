# UC 05/14: Mitarbeiter aus CSV importieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Der Administrator lädt eine CSV-Datei mit Mitarbeiterdaten hoch. Das System importiert die Mitarbeiter und weist auf Duplikate hin, die nicht übernommen werden.

## Vorbedingungen

- Der Administrator ist angemeldet
- Eine CSV-Datei mit Mitarbeiterdaten liegt vor (Spalten: Vorname, Nachname)
- Der Administrator hat explizit entschieden: "Mitarbeiter-Import"

## Ablauf

1. Der Administrator öffnet den Import-Bereich und wählt "Mitarbeiter-Import aus CSV"
2. Der Administrator lädt die CSV-Datei hoch
3. Das System liest die Datei ein und prüft das Format (Spalten: Vorname, Nachname vorhanden?)
4. Das System führt pro Zeile eine Duplikat-Prüfung durch: Existiert die Kombination Vorname+Nachname bereits?
5. Das System unterteilt die Zeilen in zwei Gruppen: "übernehmbar" und "Duplikat erkannt"
6. Das System importiert alle "übernehmbar"-Zeilen in die Mitarbeitertabelle
7. Das System erzeugt einen Import-Report mit:
    - Summe: X Mitarbeiter importiert, Y Duplikate ausgelassen
    - Detail: Auflistung aller Zeilen mit Duplikat-Fehler (Vorname, Nachname, Grund: "Bereits vorhanden")
8. Das System zeigt den Report dem Administrator

## Alternativen

- Die CSV ist nicht lesbar oder verletzt das Format (Spalten fehlen) → System bricht ab und zeigt Fehlermeldung, kein Import
- Alle Zeilen sind Duplikate → System importiert nichts, Report zeigt: "0 importiert, X Duplikate"
- Administrator bricht den Upload ab → Kein Import, kein Report

## Ergebnis

Neue Mitarbeiter sind in der Mitarbeitertabelle angelegt. Duplikate wurden nicht übernommen. Ein Import-Report ist verfügbar mit Summe und Fehlerdetails.
