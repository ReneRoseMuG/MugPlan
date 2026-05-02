# UC 34/01: Kalendermarker im Kalender anzeigen

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator, Disponent, Leser

## Ziel

Kalenderrelevante Marker im Wochen- und Monatskalender erkennen.

## Vorbedingungen

- Der Akteur ist angemeldet.
- FÃ¼r den sichtbaren Zeitraum existieren aktive Kalendermarker.

## Ablauf

1. Akteur Ã¶ffnet Wochen- oder Monatskalender.
2. System lÃ¤dt aktive Kalendermarker fÃ¼r den sichtbaren Zeitraum.
3. System hinterlegt betroffene Tage farbig entsprechend der Markerart.
4. Im Wochenkalender markiert System den betroffenen Tag als durchgehende Spalte Ã¼ber alle sichtbaren Tour-Lanes.
5. Im Monatskalender markiert System die volle betroffene Tageskachel.
6. System zeigt den Marker im Tageskopf abhÃ¤ngig vom verfÃ¼gbaren Platz als Volltext, kompakten Platzhalter oder Icon.
7. Bei komprimierter Darstellung bleibt der vollstÃ¤ndige Markername per Hover erreichbar.

## Alternativen

- Gibt es keine aktiven Marker im sichtbaren Zeitraum, bleibt die Kalenderansicht unverÃ¤ndert.
- Sind mehrere Marker auf demselben Tag aktiv, zeigt die OberflÃ¤che im Tageskopf nur einen PrimÃ¤rmarker in verdichteter Form an.

## Ergebnis

Akteur erkennt Feiertage, Betriebsfeiertage und Betriebsferien im Kalender, ohne dass Terminbedienung, Drag & Drop oder Klickverhalten blockiert werden.

