# Auftragslog: zentrale Appointment-Write-Guard

## Zweck

Die verteilte Read-only-Logik fuer bestehende Termine wurde in eine gemeinsame serverseitige Guard ueberfuehrt. Zusaetzlich wurde der geschuetzte System-Tag `Planung blockiert` in dieselbe Schutz- und Verwaltungslogik wie bestehende Termin-System-Tags integriert.

## Scope

- Zentrale serverseitige Guard fuer bestehende Termine in `server/services/appointmentsService.ts`
- Neuer reservierter Termin-System-Tag `Planung blockiert` in Shared-, Server- und Seed-Logik
- Konsistente Contract-Fehlercodes fuer Planung-blockiert-Read-only
- Frontend-Read-only-Verhalten fuer Formular, Wochenkalender, Monatsansicht und Terminliste
- Erweiterte Unit-, Integrations- und Browser-Tests inklusive Pflege von `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- Die neue Guard prueft gebuendelt drei Sperrgruende: historische Termine, storniert und Planung blockiert.
- `cancelAppointment` bleibt ein Spezialpfad und nutzt die gemeinsame Struktur nur fuer historische Sperren; Storno bleibt auch bei `Planung blockiert` weiterhin moeglich.
- Der neue Tag `Planung blockiert` wird als geschuetzter System-Tag behandelt: nicht im Picker sichtbar, nicht umbenennbar, nicht loeschbar und nicht manuell an Terminrelationen setz- oder entfernbar.
- Fuer Add/Remove von Termin-Tags bleiben die spezialisierten Schutzfehler fuer reservierte Tags fachlich vorrangig vor der allgemeinen Read-only-Guard, damit bestehendes Storno-Verhalten unveraendert bleibt.

## Betroffene Dateien

- `shared/appointmentCancellation.ts`
- `server/lib/appointmentCancellation.ts`
- `server/services/systemSeedService.ts`
- `server/services/appointmentsService.ts`
- `shared/routes.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/unit/lib/appointmentCancellation.test.ts`
- `tests/unit/services/systemSeedService.test.ts`
- `tests/unit/services/appointments.employee-removal.versioning.test.ts`
- `tests/unit/services/appointments.park.test.ts`
- `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
- `tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `tests/integration/server/admin.system-seed.integration.test.ts`
- `tests/integration/server/appointments.cancellation.integration.test.ts`
- `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Verifikation

Erfolgreich ausgefuehrt:

- `npm run test:unit -- tests/unit/lib/appointmentCancellation.test.ts tests/unit/services/systemSeedService.test.ts tests/unit/services/appointments.employee-removal.versioning.test.ts tests/unit/services/appointments.park.test.ts tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.system-seed.integration.test.ts tests/integration/server/appointments.cancellation.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`

## Bekannte Hinweise

- Fuer den neuen System-Tag wurde die Farbe `#8B6A00` verwendet.
- Ein voller Audit und voller Testlauf wurden in diesem Schritt noch nicht ausgefuehrt.
