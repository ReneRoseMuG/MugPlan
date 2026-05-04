# UC 34/05: Visualisierungsstil global wählen

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator

## Ziel

Die Intensität der Kalendermarker-Darstellung global festlegen.

## Vorbedingungen

- Akteur ist als Administrator angemeldet.
- Der Stammdaten-Tab `Feiertage` ist geöffnet.

## Ablauf

1. Administrator sieht die Stilauswahl `Dezent`, `Standard`, `Hervorgehoben`.
2. Administrator wählt einen Stil.
3. System speichert den Stil als globales Setting.
4. Wochen- und Monatskalender verwenden den wirksamen Stil beim nächsten Laden oder Aktualisieren für Hintergrundmarkierung und Markerchips.
5. System verändert dabei nur die Intensität der Farben, nicht Markerart, Markertext, Persistenz oder Seed-Logik.

## Alternativen

- Ist kein Stil gespeichert, gilt `Standard`.
- Ungültige Werte werden serverseitig abgelehnt.

## Ergebnis

Die Markerfarbe wird global in der gewählten Intensität dargestellt. Die fachliche Markerlogik bleibt unverändert.

