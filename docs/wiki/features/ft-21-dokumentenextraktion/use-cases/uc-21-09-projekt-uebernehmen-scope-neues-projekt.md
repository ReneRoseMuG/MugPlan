# UC 21/09: Projekt Ã¼bernehmen â€“ Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext â€žNeues Projektâ€œ Ã¼bernehmen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Das Formular â€žNeues Projektâ€œ ist geÃ¶ffnet.

## Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Projektdaten.
2. Wenn Titel und Beschreibung leer sind:
    1. Das System setzt den Titel auf das erkannte Modell oder den erkannten Projektnamen.
    2. Das System fÃ¼gt die extrahierte Artikelliste als HTML in das Beschreibungsfeld ein.
3. Wenn Felder bereits befÃ¼llt sind:
    1. Das System zeigt einen Warnhinweis vor dem Ãœberschreiben.
    2. Bei BestÃ¤tigung ersetzt das System die bestehenden Inhalte.

## Alternativen

- Der Akteur lehnt das Ãœberschreiben ab â†’ Bestehende Inhalte bleiben unverÃ¤ndert.

## Ergebnis

Das Projektformular enthÃ¤lt die Ã¼bernommenen Projektdaten gemÃ¤ÃŸ BestÃ¤tigung des Akteurs. AnschlieÃŸend wird die Dokumentendatei als Projekt-Attachment verknÃ¼pft (siehe UC 21/17)

