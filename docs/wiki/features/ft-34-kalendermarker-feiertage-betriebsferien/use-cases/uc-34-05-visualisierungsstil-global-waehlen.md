# UC 34/05: Visualisierungsstil global wÃ¤hlen

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Administrator

## Ziel

Die IntensitÃ¤t der Kalendermarker-Darstellung global festlegen.

## Vorbedingungen

- Akteur ist als Administrator angemeldet.
- Der Stammdaten-Tab `Feiertage` ist geÃ¶ffnet.

## Ablauf

1. Administrator sieht die Stilauswahl `Dezent`, `Standard`, `Hervorgehoben`.
2. Administrator wÃ¤hlt einen Stil.
3. System speichert den Stil als globales Setting.
4. Wochen- und Monatskalender verwenden den wirksamen Stil beim nÃ¤chsten Laden oder Aktualisieren fÃ¼r Hintergrundmarkierung und Markerchips.
5. System verÃ¤ndert dabei nur die IntensitÃ¤t der Farben, nicht Markerart, Markertext, Persistenz oder Seed-Logik.

## Alternativen

- Ist kein Stil gespeichert, gilt `Standard`.
- UngÃ¼ltige Werte werden serverseitig abgelehnt.

## Ergebnis

Die Markerfarbe wird global in der gewÃ¤hlten IntensitÃ¤t dargestellt. Die fachliche Markerlogik bleibt unverÃ¤ndert.

