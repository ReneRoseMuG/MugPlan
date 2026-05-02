# UC 21/09: Projekt übernehmen – Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../feature.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext „Neues Projekt“ übernehmen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Das Formular „Neues Projekt“ ist geöffnet.

## Ablauf

1. Der Akteur wählt die Übernahme der Projektdaten.
2. Wenn Titel und Beschreibung leer sind:
    1. Das System setzt den Titel auf das erkannte Modell oder den erkannten Projektnamen.
    2. Das System fügt die extrahierte Artikelliste als HTML in das Beschreibungsfeld ein.
3. Wenn Felder bereits befüllt sind:
    1. Das System zeigt einen Warnhinweis vor dem Überschreiben.
    2. Bei Bestätigung ersetzt das System die bestehenden Inhalte.

## Alternativen

- Der Akteur lehnt das Überschreiben ab → Bestehende Inhalte bleiben unverändert.

## Ergebnis

Das Projektformular enthält die übernommenen Projektdaten gemäß Bestätigung des Akteurs. Anschließend wird die Dokumentendatei als Projekt-Attachment verknüpft (siehe UC 21/17)
