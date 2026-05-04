# UC 21/03: Ungeeignetes Dokument behandeln

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass ungeeignete oder nicht strukturierbare Dokumente nicht zu inkonsistenten Daten führen.

## Vorbedingungen

- Das Dokument enthält keine ausreichend strukturierbaren Daten oder entspricht nicht dem erwarteten Format.
- Der Akteur startet die Dokumentextraktion.

## Ablauf

1. Der Akteur startet die Extraktion.
2. Das System extrahiert den Text.
3. Das System führt die Parsing-Regeln aus.
4. Das System erkennt, dass keine hinreichend verwertbaren strukturierten Daten erzeugt werden können.
5. Das System bricht den Prozess mit einer klaren Fehlermeldung ab.

## Alternativen

- Das Dokument enthält teilweise verwertbare Daten → Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollständige Felder.

## Ergebnis

Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.

