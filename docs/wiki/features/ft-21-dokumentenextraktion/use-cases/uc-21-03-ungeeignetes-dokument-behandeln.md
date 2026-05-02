# UC 21/03: Ungeeignetes Dokument behandeln

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass ungeeignete oder nicht strukturierbare Dokumente nicht zu inkonsistenten Daten fÃ¼hren.

## Vorbedingungen

- Das Dokument enthÃ¤lt keine ausreichend strukturierbaren Daten oder entspricht nicht dem erwarteten Format.
- Der Akteur startet die Dokumentextraktion.

## Ablauf

1. Der Akteur startet die Extraktion.
2. Das System extrahiert den Text.
3. Das System fÃ¼hrt die Parsing-Regeln aus.
4. Das System erkennt, dass keine hinreichend verwertbaren strukturierten Daten erzeugt werden kÃ¶nnen.
5. Das System bricht den Prozess mit einer klaren Fehlermeldung ab.

## Alternativen

- Das Dokument enthÃ¤lt teilweise verwertbare Daten â†’ Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollstÃ¤ndige Felder.

## Ergebnis

Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.

