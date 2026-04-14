# Auftragslog: week-card-height-sync

## Zweck

Vereinheitlichung der Wochenkalender-Terminkarten hinsichtlich Headerhöhe, Kartenhöhe pro Tour-Lane über den geladenen Vier-Wochen-Bereich, Body-/Footer-Shell sowie der sichtbaren Innenabstände zwischen Body-Containern und Footer.

## Scope

- Wochenkarten in der Kalender-Wochenansicht für Einzel- und Mehrtagestermine angleichen
- Kartenhöhen-Cache von `weekKey + laneKey` auf `laneKey` für den vorgeladenen Vier-Wochen-Strip umstellen
- Footer- und Header-Metriken stabilisieren
- Layout-Regressionssicherung in bestehenden Unit-Tests erweitern

## Technische Entscheidungen

- Gemeinsame Header- und Footer-Mindestmetriken zentral in `weekAppointmentCardStyles.ts` definiert
- Kartenhöhe pro Tour-Lane lane-weit über den geladenen Strip gemessen, Lane-Gesamthöhe aber weiterhin wochenlokal aus den realen Stack-Reihen abgeleitet
- Single-Day-Panel und Spanning-Tile auf dieselbe Shell-Struktur ausgerichtet
- Footer als fixes Zweizeilenraster modelliert, damit Badge- und Tag-Zeilen dem Body nicht unterschiedlich viel Resthöhe entziehen
- Header auf feste sichtbare Höhe mit `box-border` ausgerichtet, damit Einzel- und Mehrtageskarten dieselbe Headerhöhe rendern

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/weekAppointmentCardStyles.ts`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

- `npm run check`
- `npx vitest run tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`

## Bekannte Einschränkungen

- Die Änderungen wurden gezielt gegen den beschriebenen Wochenkarten-Bereich abgesichert, aber nicht als voller Audit oder voller Testlauf über alle Pflichtkommandos aus Abschnitt 12 ausgeführt.
- Falls visuell weiterhin Unterschiede in echten Browser-Screenshots sichtbar bleiben, ist als nächster Schritt DOM-/Runtime-Messung im Browser sinnvoll, um verbleibende renderzeitige Unterschiede zwischen Einzel- und Mehrtageskarten direkt zu erfassen.
