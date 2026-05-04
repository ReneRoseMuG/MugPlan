# UC 16/05: Hilfetexte durchsuchen und anzeigen

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Hilfetexte anhand von Suchkriterien auffinden und zur weiteren Bearbeitung anzeigen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Es existieren Hilfetexte im System.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Das System lädt die Liste der Hilfetexte.
3. Der Akteur gibt ein Suchkriterium ein, beispielsweise help_key oder Titel.
4. Das System filtert die Hilfetexte serverseitig anhand des eingegebenen Suchkriteriums.
5. Das System zeigt die gefilterte Trefferliste an.
6. Der Akteur kann einen Hilfetext aus der Liste auswählen, um dessen Detailansicht zu öffnen.

## Alternativen

- Keine Hilfetexte vorhanden → Das System zeigt eine leere Liste an.
- Suchkriterium liefert keine Treffer → Das System zeigt eine leere Trefferliste an.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück und zeigt keine oder eine unvollständige Liste an.

## Ergebnis

Der Akteur erhält eine gefilterte und konsistente Ãœbersicht der Hilfetexte und kann einzelne Datensätze zur weiteren Bearbeitung auswählen.

