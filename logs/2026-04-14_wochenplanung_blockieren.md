# Auftrag: Wochenplanung blockieren

## Zweck

Einführung einer expliziten Tour-Wochen-Entität für die Wochenplanung mit Blockierstatus, ohne Legacy-KWs per Backfill anzulegen. Blockierte Wochen sollen in Tour-Wochenplanung, Wochenkalender und Monatskalender sichtbar und steuerbar sein.

## Scope

- Neue Tabelle `tour_week` mit Status `isBlocked`
- Neue Endpunkte zum Anlegen, Blockieren und Freigeben von Tour-Wochen
- Fortführung der bestehenden Mitarbeiterplanung über `tour_week_employees`
- Legacy-Fallback ohne automatische Altbestands-Migration
- UI-Aktionen in Tour-KW-Karten und im Wochenkalender-Lane-Menü
- Schraffierte Sperrflächen in Wochen- und Monatskalender
- Unterdrückung der Konflikt-Schraffur in blockierten Wochen

## Technische Entscheidungen

- `tour_week` ist die führende Entität für Existenz und Status einer Woche.
- `tour_week_employees` bleibt für Mitarbeiterzuweisungen in diesem Auftrag strukturell unverändert.
- Es gibt bewusst keinen SQL-Backfill aus Legacy-Wochen, damit keine unnötigen KW-Datensätze entstehen.
- Legacy-Wochen aus `tour_week_employees` bleiben in Listen als Fallback sichtbar.
- Beim Blockieren werden betroffene Termine von Mitarbeitern geleert und mit dem reservierten Termin-Tag `Planung blockiert` markiert.
- Beim Freigeben wird nur die Wochenblockierung und das System-Tag entfernt; Mitarbeiter werden nicht automatisch wiederhergestellt.

## Betroffene Dateien

- `shared/schema.ts`
- `shared/routes.ts`
- `migrations/0024_tour_weeks.sql`
- `migrations/meta/_journal.json`
- `migrations/meta/0024_snapshot.json`
- `server/repositories/tourWeeksRepository.ts`
- `server/services/tourWeeksService.ts`
- `server/controllers/tourWeeksController.ts`
- `server/routes/tourWeeksRoutes.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/services/appointmentsService.ts`
- `server/controllers/appointmentsController.ts`
- `server/routes/appointmentsRoutes.ts`
- `server/routes.ts`
- `server/services/dumpService.ts`
- `client/src/lib/calendar-appointments.ts`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/calendar/CalendarWeekNotesButton.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.headerControls.test.tsx`
- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests und Prüfungen

Ausgeführt:

- `npm run typecheck`
- `npm run check:encoding`
- `npm run db:migrate:dev`
- `npm run db:migrate:test`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.headerControls.test.tsx tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`

## Bekannte Einschränkungen

- Die bestehende Mitarbeiterplanung bleibt hybrid: Status über `tour_week`, Mitarbeiter weiter über `tour_week_employees`.
- Freigeben stellt entfernte Termin-Mitarbeiter nicht automatisch wieder her.
- Ein voller Audit und ein voller Testlauf über alle Pflichtkommandos wurden in diesem Auftrag nicht ausgeführt.
