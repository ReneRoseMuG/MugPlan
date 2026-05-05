# UC 34/05: Visualisierungsstil global wählen

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)

## Akteur

Administrator, Disponent

## Ziel

Die Intensität der Kalendermarker-Darstellung global festlegen.

## Vorbedingungen

- Akteur ist als Administrator oder Disponent angemeldet.
- Der Bereich `Einstellungen > Feiertage` ist geöffnet.

## Ablauf

1. Akteur sieht die Stilauswahl `Dezent`, `Standard`, `Hervorgehoben`.
2. Akteur wählt einen Stil.
3. System speichert den Stil als globales Setting.
4. Wochen- und Monatskalender verwenden den wirksamen Stil beim nächsten Laden oder Aktualisieren für Hintergrundmarkierung und Markerchips.
5. System verändert dabei nur die Intensität der Farben, nicht Markerart, Markertext, Persistenz oder Seed-Logik.

## Alternativen

- Ist kein Stil gespeichert, gilt `Standard`.
- Ungültige Werte werden serverseitig abgelehnt.
- Leser versucht den Schreibpfad direkt zu nutzen: System lehnt serverseitig ab.

## Ergebnis

Die Markerfarbe wird global in der gewählten Intensität dargestellt. Die fachliche Markerlogik bleibt unverändert.
