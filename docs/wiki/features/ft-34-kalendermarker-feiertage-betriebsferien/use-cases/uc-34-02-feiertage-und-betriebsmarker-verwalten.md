# UC 34/02: Feiertage und Betriebsmarker verwalten

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)

## Akteur

Administrator, Disponent

## Ziel

Gespeicherte Kalendermarker prüfen und Betriebsfeiertage oder Betriebsferien pflegen.

## Vorbedingungen

- Akteur ist als Administrator oder Disponent angemeldet.
- Der Bereich `Einstellungen > Feiertage` ist erreichbar.

## Ablauf

1. Akteur öffnet `Einstellungen > Feiertage`.
2. System zeigt gespeicherte gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien in der Tabelle.
3. Akteur legt einen neuen Betriebsfeiertag oder eine neue Betriebsferienperiode an.
4. System validiert Datum, Zeitraum, Typ und Pflichtfelder.
5. System speichert den Marker im Kalendermarker-Bestand.
6. System aktualisiert Tabelle und Kalenderdaten.

## Alternativen

- Akteur bearbeitet einen bestehenden Marker.
- Akteur löscht einen Marker, wenn dies fachlich zulässig ist.
- Leser ruft den Bereich auf oder den Schreibpfad direkt: System verweigert die Pflege serverseitig.
- Bei ungültigen Eingaben lehnt das System die Speicherung ab.

## Ergebnis

Der gespeicherte Kalendermarker-Bestand ist aktualisiert und wird in Kalenderansichten berücksichtigt, sofern der Marker aktiv ist.
