# UC 21/02: Extrahierte Daten bestätigen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Einen durch Parsing erzeugten Extraktionsvorschlag prüfen, anpassen und in die entsprechenden Domänenobjekte übernehmen.

## Vorbedingungen

- Ein validierter Extraktionsvorschlag liegt vor.
- Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verändern.

## Ablauf

1. Der Akteur prüft die vorbefüllten Kundendaten.
2. Der Akteur passt bei Bedarf einzelne Felder an.
3. Der Akteur prüft die extrahierte Artikelliste.
4. Der Akteur bestätigt die Ãœbernahme.
5. Das System validiert die Daten gemäÃŸ den jeweiligen Domänenregeln.
6. Das System persistiert die Daten transaktional in den betroffenen Domänenobjekten.
7. Das System aktualisiert betroffene Sichten und Auswahlkomponenten.

## Alternativen

- Der Akteur bricht den Vorgang ab → Es erfolgt keine Speicherung; bestehende Daten bleiben unverändert.
- Bei der Persistierung tritt ein Validierungsfehler auf → Das System zeigt eine Fehlermeldung an; es werden keine Teilzustände gespeichert.
- Während der Persistierung tritt ein Versionskonflikt auf → Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.

## Ergebnis

Die bestätigten Daten sind persistent gespeichert und fachlich korrekt den jeweiligen Domänenobjekten zugeordnet.

