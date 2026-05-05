# UC 16/10: Hilfetexte in Datei exportieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)

## Akteur

Admin

## Ziel

Alle Hilfetexte aus dem System in eine Datei exportieren, um sie außerhalb der Anwendung versionierbar abzulegen, zu prüfen und gezielt wieder importieren zu können.

## Vorbedingungen

Der Akteur ist authentifiziert und besitzt Admin-Rechte. Im System können null bis beliebig viele Hilfetexte existieren.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung und startet die Funktion „Hilfetexte exportieren“.
2. Das System lädt alle Hilfetexte aus der Datenhaltung, inklusive `help_key` und Inhalt sowie optionaler Metadaten, sofern vorhanden.
3. Das System schreibt die Datensätze in das definierte Exportformat, wobei pro `help_key` genau ein Eintrag enthalten ist.
4. Das System stellt die Exportdatei zum Download bereit.

## Alternativen

Wenn keine Hilfetexte vorhanden sind, erzeugt das System eine gültige Exportdatei mit leerer Itemliste. Wenn ein technischer Fehler auftritt, liefert das System eine Fehlermeldung und erzeugt keine Datei.

## Ergebnis

Eine Exportdatei liegt vor, die alle Hilfetexte vollständig und konsistent enthält und als Grundlage für spätere Änderungen und Re-Import geeignet ist.
