# UC 34/04: Marker deaktivieren und reaktivieren

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator

## Ziel

Einen gespeicherten Marker zeitweise aus der Kalenderanzeige entfernen und später wieder anzeigen.

## Vorbedingungen

- Akteur ist als Administrator angemeldet.
- Ein gespeicherter Kalendermarker existiert.

## Ablauf

1. Administrator öffnet `Stammdaten > Feiertage`.
2. Administrator wählt einen aktiven Marker.
3. Administrator deaktiviert den Marker.
4. System speichert den Marker mit Aktiv-Status inaktiv.
5. System entfernt den Marker aus dem Kalender-Leseendpunkt.
6. Administrator reaktiviert den Marker bei Bedarf.
7. System nimmt den Marker wieder in die Kalenderanzeige auf.

## Alternativen

- Wird der Marker nur bearbeitet, bleibt sein Aktiv-Status unverändert.
- Ein späterer Seed darf den deaktivierten Marker nicht wieder aktivieren.

## Ergebnis

Der Aktiv-Status steuert die Kalenderanzeige, ohne den gespeicherten Marker aus der Verwaltung zu entfernen.

