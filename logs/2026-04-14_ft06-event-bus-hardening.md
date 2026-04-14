# FT06 Event Bus Hardening

## Zweck

Zentralisierung der FT06-Terminfolgen über ein gemeinsames `mutationEvents`-Modell statt nur über verteilte UI-Pfade. Zusätzlich Absicherung der bereits vorhandenen FT06- und Wochenplan-Flows durch erweiterte Unit-, Integrations- und Browser-Tests sowie Korrekturen am Wochenkalender-Header.

## Scope

- Shared-Contract für `AppointmentMutationEvent` ergänzt.
- `createAppointment` und `updateAppointment` liefern `mutationEvents` für Tour-Wechsel sowie automatische Tag-Folgen zurück.
- Appointment-Formular und Wochenkalender verarbeiten `mutationEvents` für Notizvorschlag und Notiz-Entfernen.
- Wochenplanung sperrt die Tour `Parkplatz` für KW-Mitarbeiterzuweisungen.
- Wochen-Tour-Header korrigiert:
  - Menü links vor der Notizanzeige.
  - Notizanzeige nur noch passiv.
  - Menü technisch vom Header-Klick entkoppelt.

## Technische Entscheidungen

- Neues Shared-Modul `shared/appointmentMutationEvents.ts` als zentrale Typquelle eingeführt.
- Response-Schema für Termin-Create und Termin-Update in `shared/routes.ts` contract-first erweitert.
- Serverseitige Folgelogik bleibt in `appointmentsService.ts` gebündelt; UI reagiert nur auf die gelieferten Events.
- Save-Folgedialoge im Appointment-Formular verzögern den finalen `onSaved`-Rückweg, bis der FT06-Dialog bestätigt oder verworfen wurde.
- Die Tour `Parkplatz` wird in `tourWeekEmployeesService.ts` fachlich von der Wochenplanung ausgeschlossen.

## Betroffene Dateien

- `shared/appointmentMutationEvents.ts`
- `shared/routes.ts`
- `server/lib/systemTours.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/calendar/CalendarWeekNotesButton.tsx`
- `tests/unit/services/appointments.park.test.ts`
- `tests/integration/server/appointments.park.integration.test.ts`
- `tests/integration/server/appointments.dragdrop.success.integration.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `tests/unit/ui/calendarWeekNotesButton.wiring.test.tsx`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

Ausgeführt:

- `npm run check`
- `npm run test:unit -- --reporter=verbose tests/unit/services/appointments.park.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.park.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.dragdrop.success.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts`
- `npm run test:unit -- --reporter=verbose tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx tests/unit/ui/calendarWeekNotesButton.wiring.test.tsx`

## Bekannte Einschränkungen

- `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts` lief in diesem Arbeitsstand mehrfach in einen Timeout, während der deterministische Wochen-Drop-Dispatch-Test grün war. Der native Drag-Pfad sollte deshalb separat beobachtet werden.
- Für die laufende Woche gilt serverseitig weiterhin `PAST_WEEK_READONLY` in der Wochenplanung. Die fachliche Entscheidung, ob Blockieren/Freigeben in angebrochenen Wochen erlaubt bleiben soll, ist noch offen.
