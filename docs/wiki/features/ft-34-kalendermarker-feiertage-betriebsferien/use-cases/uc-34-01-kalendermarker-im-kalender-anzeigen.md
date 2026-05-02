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
3. System hinterlegt betroffene Tage oder Tagesbereiche farbig.
4. System zeigt den vollständigen Markernamen klein im Kalenderkopf oder in der Monatskachel an.
5. Bei gekürzter Darstellung bleibt der vollständige Name per Tooltip erreichbar.

## Alternativen

- Gibt es keine aktiven Marker im sichtbaren Zeitraum, bleibt die Kalenderansicht unverändert.
- Sind mehrere Marker auf demselben Tag aktiv, zeigt die Oberfläche die Marker in verdichteter Form an.

## Ergebnis

Akteur erkennt Feiertage, Betriebsfeiertage und Betriebsferien im Kalender, ohne dass Terminbedienung, Drag & Drop oder Klickverhalten blockiert werden.
