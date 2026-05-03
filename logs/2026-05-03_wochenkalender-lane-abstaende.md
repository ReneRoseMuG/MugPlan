# Ergebnisdokumentation: Wochenkalender Lane-Abstände

## Zweck

Diese Dokumentation beschreibt die Layout-Korrektur der Tour-Lanes im Wochenkalender.

## Auftrag

Im Wochenkalender waren direkt unter einer Tour-Header-Bar und direkt über der nächsten Tour-Header-Bar schmale Hintergrundstreifen sichtbar. Diese Streifen entstanden durch zusätzliche vertikale Abstände außerhalb der eigentlichen Tages- und Terminkacheln. Das vorhandene Padding der Terminkarten sollte erhalten bleiben, der zusätzliche Lane-Abstand sollte entfernt werden.

## Umsetzung

- `client/src/components/calendar/CalendarWeekView.tsx`
  - Der vertikale Abstand zwischen den Tour-Lanes wurde entfernt.
  - Der Abstand zwischen Tour-Header-Bar und dem Tagesraster der Lane wurde entfernt.
  - Das Padding der Terminkarten innerhalb des Tagesrasters bleibt unverändert.
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
  - Der bestehende Layout-Regressionstest wurde erweitert.
  - Der Test prüft jetzt, dass keine äußeren Lane-Abstände mehr gerendert werden und das Karten-Padding erhalten bleibt.

## Rollen- und Rechteprüfung

Keine Rollen-, Sichtbarkeits- oder Berechtigungslogik wurde geändert. Die Änderung betrifft ausschließlich Layout-Klassen im bestehenden Wochenkalender. Reader-, Dispatcher- und Admin-Verhalten bleibt unverändert.

## Prüfung

Ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx` - erfolgreich.
- Live-DOM-Check auf der laufenden Dev-Instanz: Die ersten sichtbaren Tour-Lanes hatten jeweils `headerToGridGap: 0` und `laneToNextLaneGap: 0`.

## Ergebnis

Die Tour-Header-Bars schließen ohne zusätzlichen vertikalen Leerraum an die Tagesraster und an die nächste Tour-Lane an. Die Terminkarten behalten ihren inneren Abstand zur Tageskachel.
