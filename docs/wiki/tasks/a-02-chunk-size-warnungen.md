# A-02 - Chunk-Size-Warnungen analysieren und fachlich entkoppeln

## Metadaten

- Status: offen
- Priorität: Mittel
- Typ: Analyse
- Erstellt: 06.05.26
- Quelle: [W-15 - Chunk-Size-Warnungen strategisch behandeln](../decisions/w-15-chunk-size-warnungen.md)
- Verantwortlich: offen

## Beziehungen

- Features:
  - Frontend-Build, Bundle-Struktur und Lazy Loading
- Use Cases:
  - Keine direkten Use Cases.
- Entscheidungen:
  - [W-15 - Chunk-Size-Warnungen strategisch behandeln](../decisions/w-15-chunk-size-warnungen.md)

## Ziel

Die realen Verursacher großer Frontend-Chunks sollen sichtbar gemacht und fachlich gut trennbare Bereiche anschließend gezielt aus dem Initialpfad gelöst werden.

## Ausgangslage

W-15 enthält bereits einen bevorzugten Pfad: erst Build-Struktur analysieren, dann klare Lazy-Loading-Kandidaten und unnötige Importkopplungen bearbeiten. Der Punkt ist damit als Aufgabe nachverfolgbar.

## Umfang

Zur Aufgabe gehören Build-Analyse, Identifikation großer Einstiegspfade, Bewertung seltener Fachbereiche wie Reports, Admin-Screens, Spezialansichten oder Druckpfade sowie gezielte Entkopplung, falls die Analyse konkrete Kandidaten belegt.

Nicht Teil der Aufgabe ist das bloße Erhöhen von Warning-Limits oder eine manuelle Chunk-Aufteilung ohne vorherige Ursachenanalyse.

## Umsetzungshinweise

- Bestehende Navigation, Ladezustände und Initialisierungspfade müssen berücksichtigt werden.
- Keine Build-, Tooling- oder Konfigurationsänderung ohne ausdrücklichen Auftrag innerhalb der Umsetzung.
- Rollen- und Sicherheitslogik wird nicht fachlich geändert; lazy geladene Screens müssen bestehende serverseitige Rechte weiter nutzen.

## Anhänge

- Notion-Quelle aus W-15: `https://www.notion.so/34bda094354e809fb1d3da9c84ba9046`

## Blocker und offene Fragen

- Konkrete Messwerte und betroffene Chunks müssen vor Codeänderungen erhoben werden.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
