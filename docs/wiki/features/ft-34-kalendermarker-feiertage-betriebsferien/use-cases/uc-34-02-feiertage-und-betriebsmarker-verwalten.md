# UC 34/02: Feiertage und Betriebsmarker verwalten

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../feature.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator

## Ziel

Gespeicherte Kalendermarker prüfen und Betriebsfeiertage oder Betriebsferien pflegen.

## Vorbedingungen

- Akteur ist als Administrator angemeldet.
- Der Stammdatenbereich ist erreichbar.

## Ablauf

1. Administrator öffnet `Stammdaten > Feiertage`.
2. System zeigt gespeicherte gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien in der Tabelle.
3. Administrator legt einen neuen Betriebsfeiertag oder eine neue Betriebsferienperiode an.
4. System validiert Datum, Zeitraum, Typ und Pflichtfelder.
5. System speichert den Marker im Kalendermarker-Bestand.
6. System aktualisiert Tabelle und Kalenderdaten.

## Alternativen

- Administrator bearbeitet einen bestehenden Marker.
- Administrator löscht einen Marker, wenn dies fachlich zulässig ist.
- Bei ungültigen Eingaben lehnt das System die Speicherung ab.

## Ergebnis

Der gespeicherte Kalendermarker-Bestand ist aktualisiert und wird in Kalenderansichten berücksichtigt, sofern der Marker aktiv ist.
