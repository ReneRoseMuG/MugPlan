# UC 21/03: Ungeeignetes Dokument behandeln

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

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
4. Das System erkennt, ob zumindest Kundendaten oder Projektdaten verwertbar sind.
5. Wenn keine hinreichend verwertbaren strukturierten Daten erzeugt werden können, bricht das System den Prozess mit einer klaren Fehlermeldung ab.

## Alternativen

- Das Dokument enthält teilweise verwertbare Daten → Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollständige oder auffällige Felder.
- Einzelne fachliche Bereiche fehlen, etwa die Artikelliste → Das System behandelt dies als Hinweis oder Warnung, solange andere verwertbare Daten vorhanden sind.

## Ergebnis

Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.
