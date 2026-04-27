# Auftragslog: Week Calendar Grid Root Cause and Save

## Zweck

Dieses Log dokumentiert die zweite Session zum defekten Wochenkalender-Grid nach der vorherigen Testsuite-Arbeit.

Ziel dieser Session war:

- die eigentliche Rasterursache klarer von bloßen Karten-Symptomen zu trennen
- den Repro-Fall mit oberem Mehrtagestermin und zusätzlichem unteren Tagestermin technisch greifbar zu machen
- die horizontale Geometrie zwischen oberem und unterem Bereich in der Tour-Lane anzugleichen
- den aktuellen Stand anschließend zu sichern

## Scope

Im Scope dieser Session lagen:

- Analyse der globalen Wochenraster- und Lane-Logik in `CalendarWeekView.tsx`
- Abgleich der beobachteten Screenshots mit den realen Renderpfaden
- Korrektur der Vollbreiten- und Wrapper-Logik für obere und untere Tageskartenpfade
- Ergänzung eines gezielten Browser-Repro-Tests für den Overflow-/Mischfall

Nicht im Scope lagen:

- vollständige finale Bereinigung aller älteren Browser-Tests
- breite Dokumentationssynchronisation in `docs/`
- weitere Produktänderungen außerhalb des Wochenkalender-Layouts

## Technische Entscheidungen

### 1. Fokuswechsel weg von den Karteninhalten

Im Verlauf der Session wurde ausdrücklich bestätigt, dass das Hauptproblem nicht nur in Kartenbreiten oder Body-Inhalten liegt, sondern in der Kopplung von:

- globalem Tagesraster
- oberem Lane-Bereich
- unterem Lane-Bereich
- und den unterschiedlichen Renderpfaden für Ein-Tagestermine und Mehrtagestermine

Die Screenshots zeigten, dass sich die sichtbaren Tagesflächen und Tageskanten mitverändern, wenn ein Termin zwischen Ein-Tagetermin und Mehrtagetermin umgeschaltet wird.

### 2. Oberer und unterer Bereich müssen dieselbe horizontale Geometrie erzwingen

Die zentrale technische Entscheidung war deshalb:

- Der obere normale Single-Day-Pfad und der untere Overflow-/DayCell-Pfad müssen dieselbe horizontale Breitenlogik verwenden.
- Die Kartenwurzel selbst muss in beiden Kartenfamilien konsequent `w-full` und `min-w-0` erzwingen.

Daraus ergaben sich diese gezielten Änderungen:

- `CalendarWeekAppointmentPanel.tsx`: Kartenwurzel auf harte Vollbreite gezogen
- `CalendarWeekSpanningTile.tsx`: Kartenwurzel ebenfalls auf harte Vollbreite gezogen
- `CalendarWeekView.tsx`: der untere Bereich `needsDayCellRow` bekam dieselbe horizontale Wrapper-Strenge wie der obere Grid-Pfad

### 3. Neuer Repro-Test für den echten Mischfall

Ein neuer Browser-Test wurde nicht auf abstrakte Breitenrelationen, sondern auf den konkret beschriebenen Repro-Fall zugeschnitten:

- oben ein Zwei-Tages-Termin über Montag und Dienstag
- darunter ein zusätzlicher Ein-Tagestermin am Montag im unteren Bereich
- Vergleich dieses unteren Montagstermins mit einem regulären Montagstermin in einer anderen Tour

Dieser Test ist näher am fachlich beschriebenen Fehlerbild als die zuvor eher karten- oder segmentorientierten Vergleiche.

## Betroffene Dateien

Produktiv:

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`

Tests:

- `tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`

Logs:

- `logs/2026-04-20_week-calendar-grid-test-suite.md`
- `logs/2026-04-20_week-calendar-grid-root-cause-and-save.md`

## Hinweise zum Testen

Gezielt ausgeführt wurden in dieser Session:

- `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarWeekView.lanePlacement.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- --grep "keeps the lower overflow monday card aligned with the regular monday column in standard mode" tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`

Wichtiges Ergebnis:

- Die Unit-Tests waren grün.
- Der gezielte Overflow-/Mischfall im Browser war nach der Horizontal-Korrektur grün.
- Ein älterer Boundary-Test zur inneren Segmentgrenze einer SpanningTile blieb rot und wurde in der Session als wahrscheinlich irreführender Vergleich eingeordnet, weil er keine echten Außenkanten derselben Referenzfläche vergleicht.

## Bekannte Einschränkungen

- Es ist möglich, dass noch nicht alle sichtbaren Lane-Hintergrund- oder Tagesflächenprobleme vollständig beseitigt sind.
- Der ältere rote Boundary-Test ist noch nicht bereinigt oder ersetzt; er bleibt als offener Nacharbeitspunkt bestehen.
- Die Session hat den Fokus bewusst auf den Repro-Fall mit oberem Mehrtagetermin und zusätzlichem unteren Tagestermin gelegt; eine vollständige Neuordnung der Browser-Suite steht noch aus.

## Ergebnis

Die Session hat die eigentliche Fehlerursache deutlich präziser eingegrenzt:

- Nicht nur Karteninhalte oder Kachelmodi, sondern die horizontale Kopplung zwischen oberem und unterem Lane-Bereich war fehleranfällig.
- Der kritische Mischfall mit oberem Mehrtagetermin und zusätzlichem unteren Tagestermin wurde technisch als eigener Repro-Fall abgesichert.
- Der aktuelle Stand ist damit näher an der eigentlichen Rasterlogik als die vorherigen symptomorientierten Anpassungen.
