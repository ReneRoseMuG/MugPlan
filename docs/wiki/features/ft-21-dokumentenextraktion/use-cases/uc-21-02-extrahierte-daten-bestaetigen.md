# UC 21/02: Extrahierte Daten bestÃ¤tigen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen durch Parsing erzeugten Extraktionsvorschlag prÃ¼fen, anpassen und in die entsprechenden DomÃ¤nenobjekte Ã¼bernehmen.

## Vorbedingungen

- Ein validierter Extraktionsvorschlag liegt vor.
- Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verÃ¤ndern.

## Ablauf

1. Der Akteur prÃ¼ft die vorbefÃ¼llten Kundendaten.
2. Der Akteur passt bei Bedarf einzelne Felder an.
3. Der Akteur prÃ¼ft die extrahierte Artikelliste.
4. Der Akteur bestÃ¤tigt die Ãœbernahme.
5. Das System validiert die Daten gemÃ¤ÃŸ den jeweiligen DomÃ¤nenregeln.
6. Das System persistiert die Daten transaktional in den betroffenen DomÃ¤nenobjekten.
7. Das System aktualisiert betroffene Sichten und Auswahlkomponenten.

## Alternativen

- Der Akteur bricht den Vorgang ab â†’ Es erfolgt keine Speicherung; bestehende Daten bleiben unverÃ¤ndert.
- Bei der Persistierung tritt ein Validierungsfehler auf â†’ Das System zeigt eine Fehlermeldung an; es werden keine TeilzustÃ¤nde gespeichert.
- WÃ¤hrend der Persistierung tritt ein Versionskonflikt auf â†’ Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.

## Ergebnis

Die bestÃ¤tigten Daten sind persistent gespeichert und fachlich korrekt den jeweiligen DomÃ¤nenobjekten zugeordnet.

