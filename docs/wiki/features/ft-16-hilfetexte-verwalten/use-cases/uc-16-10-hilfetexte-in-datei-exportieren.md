# UC 16/10: Hilfetexte in Datei exportieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Alle Hilfetexte aus dem System in eine Datei exportieren, um sie auÃŸerhalb der Anwendung versionierbar abzulegen, zu prÃ¼fen und gezielt wieder importieren zu kÃ¶nnen.

## Vorbedingungen

Der Akteur ist authentifiziert und besitzt Admin-Rechte. Im System kÃ¶nnen null bis beliebig viele Hilfetexte existieren.

## Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung und startet die Funktion â€žHilfetexte exportierenâ€œ.
2. Das System lÃ¤dt alle Hilfetexte aus der Datenhaltung, inklusive `help_key` und Inhalt sowie optionaler Metadaten, sofern vorhanden.
3. Das System schreibt die DatensÃ¤tze in das definierte Exportformat, wobei pro `help_key` genau ein Eintrag enthalten ist.
4. Das System stellt die Exportdatei zum Download bereit.

## Alternativen

Wenn keine Hilfetexte vorhanden sind, erzeugt das System eine gÃ¼ltige Exportdatei mit leerer Itemliste. Wenn ein technischer Fehler auftritt, liefert das System eine Fehlermeldung und erzeugt keine Datei.

## Ergebnis

Eine Exportdatei liegt vor, die alle Hilfetexte vollstÃ¤ndig und konsistent enthÃ¤lt und als Grundlage fÃ¼r spÃ¤tere Ã„nderungen und Re-Import geeignet ist.

