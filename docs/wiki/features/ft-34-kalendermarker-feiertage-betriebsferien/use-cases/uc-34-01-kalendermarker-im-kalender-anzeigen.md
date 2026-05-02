# UC 34/01: Kalendermarker im Kalender anzeigen

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../feature.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator, Disponent, Leser

## Ziel

Kalenderrelevante Marker im Wochen- und Monatskalender erkennen.

## Vorbedingungen

- Der Akteur ist angemeldet.
- Für den sichtbaren Zeitraum existieren aktive Kalendermarker.

## Ablauf

1. Akteur öffnet Wochen- oder Monatskalender.
2. System lädt aktive Kalendermarker für den sichtbaren Zeitraum.
3. System hinterlegt betroffene Tage farbig entsprechend der Markerart.
4. Im Wochenkalender markiert System den betroffenen Tag als durchgehende Spalte über alle sichtbaren Tour-Lanes.
5. Im Monatskalender markiert System die volle betroffene Tageskachel.
6. System zeigt den Marker im Tageskopf abhängig vom verfügbaren Platz als Volltext, kompakten Platzhalter oder Icon.
7. Bei komprimierter Darstellung bleibt der vollständige Markername per Hover erreichbar.

## Alternativen

- Gibt es keine aktiven Marker im sichtbaren Zeitraum, bleibt die Kalenderansicht unverändert.
- Sind mehrere Marker auf demselben Tag aktiv, zeigt die Oberfläche im Tageskopf nur einen Primärmarker in verdichteter Form an.

## Ergebnis

Akteur erkennt Feiertage, Betriebsfeiertage und Betriebsferien im Kalender, ohne dass Terminbedienung, Drag & Drop oder Klickverhalten blockiert werden.
