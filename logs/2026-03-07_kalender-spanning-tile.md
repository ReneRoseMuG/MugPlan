# Kalender Spanning Tile

## Zweck

Umstellung der Wochenansicht, damit echte Mehrtagestermine als zusammenhaengende Spanning Tiles ueber mehrere Wochentage gerendert werden statt als Start-/Continuation-Segmente in einzelnen Tagesstapeln.

## Scope

- Frontend-Rendering der Wochenansicht fuer echte Mehrtagestermine
- Neue Kalender-Helper fuer Stack-Prioritaet sowie Grid-Start/Span-Berechnung
- Gezielte Unit-Tests fuer neue Verdrahtung und Helper
- Pflege der Test-Matrix

## Technische Entscheidungen

- Nur echte Mehrtagestermine mit `getAppointmentDurationDays(appointment) > 0` werden als Spanning Tile gerendert.
- Eintagestermine bleiben im bestehenden DayCell-Stack.
- DayCells bleiben die einzigen Drop-Targets; Spanning Tiles sind nur Drag-Quellen.
- Tageskopf-Counter bleiben an `dayBuckets` gekoppelt, damit keine stille Zaehlerregression entsteht.
- Mehrere Spanning Tiles in einer Lane werden ueber explizite Grid-Rows getrennt und nicht ueber visuelle Ueberlagerung gelost.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/lib/calendar-utils.ts`
- `tests/unit/ui/calendarWeekView.continuationHeight.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.tourHeaderCounters.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.spanningTiles.wiring.test.tsx`
- `tests/unit/ui/calendarWeekSpanningTile.utils.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm run test:run -- tests/unit/ui/calendarWeekView.continuationHeight.wiring.test.tsx tests/unit/ui/calendarWeekView.tourHeaderCounters.wiring.test.tsx tests/unit/ui/calendarWeekView.spanningTiles.wiring.test.tsx tests/unit/ui/calendarWeekSpanningTile.utils.test.ts tests/unit/ui/calendarWeekAppointmentPanel.continuationHeight.wiring.test.tsx`
- `npm run typecheck`

Ergebnis:

- Alle gezielten Unit-Tests erfolgreich
- TypeScript-Check erfolgreich

## Bekannte Einschraenkungen

- Es wurde kein voller Testlauf und kein voller Audit ausgefuehrt.
- Die vorhandene Continuation-Logik im `CalendarWeekAppointmentPanel` bleibt fuer andere Kontexte und bestehende Absicherungen erhalten.
