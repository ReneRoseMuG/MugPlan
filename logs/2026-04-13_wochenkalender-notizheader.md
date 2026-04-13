# Auftragslog: Wochenkalender Notizheader

## Zweck

Korrektur der Darstellung des tourbezogenen Wochenkalender-Headers, damit Notiz-Icon und Zähler nicht mehr in das Tour-Label rutschen und links kompakt, klar getrennt und vertikal sauber ausgerichtet erscheinen.

## Scope

- Anpassung des Header-Layouts für Tour-Lanes im Wochenkalender
- Keine Änderung an Persistenz, Routen, Services oder Kalenderlogik
- Keine Änderung am Tageskachelraster oder an den Tagesspalten

## Technische Entscheidungen

- Der Header wurde lokal in eine feste linke Notizspalte und einen separaten rechten Labelbereich aufgeteilt.
- Die linke Spalte wurde nach dem ersten Schritt bewusst kompakter gemacht, um zu viel Flächenverbrauch zu vermeiden.
- Icon und Zähler wurden explizit vertikal mittig in der Notizspalte ausgerichtet.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`

## Hinweise zum Testen

- Wochenkalender öffnen
- Prüfen, dass das Notiz-Icon links im Tour-Balken sitzt
- Prüfen, dass der Zähler nicht mehr in das Tour-Label rutscht
- Prüfen, dass Tour-Label und Notizbereich optisch getrennt bleiben
- Prüfen, dass sich das Tageskachelraster durch die Header-Änderung nicht verschiebt

## Bekannte Einschränkungen

- Kein automatischer Audit- oder Testlauf durchgeführt
- Feintuning der Breite oder der Trennoptik kann nach Sichtprüfung im UI noch nötig sein
