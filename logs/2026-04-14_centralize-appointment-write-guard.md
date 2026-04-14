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

- Fuer die reservierten Termin-Tags `Storniert` und `Planung blockiert` wird gemeinsam die dunkle Rot-Schwarz-Farbe `#3B2025` verwendet.
- Ein voller Audit und voller Testlauf wurden in diesem Schritt noch nicht ausgefuehrt.

## Nachtrag

- Die gemeinsame Farbe fuer `Storniert` und `Planung blockiert` wurde nachtraeglich abgestimmt und auf `#3B2025` gesetzt.
- Die direkt betroffenen Seed-, Service- und UI-Tests wurden darauf nachgezogen.

## Audit und Test-Report

Erfolgreich ausgefuehrt:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`
- `npm run test:integration -- --reporter=verbose`

Unit-Testlauf ausgefuehrt mit bestehenden roten Faellen:

- `npm run test:unit`
- Rot: `tests/unit/ui/home.behavior.test.tsx`
  - `hides the sidebar while the employees form is visible`
  - `restores the week scroll position when returning from the fullscreen appointment form`
  - `passes pending week scroll restore into the global week workspace`
- Rot: `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
  - `keeps create mode flow in the main column and routes tour selection through AppointmentEmployeeSlot`

Einordnung:

- Der komplette Integration-Lauf war gruen.
- Die roten Unit-Faelle liegen ausserhalb der hier geaenderten Farb-/Seed-Stellen und betreffen bestehende Home-/Layout-Verdrahtung.

## Nachtrag: zentraler Storno-Dialog in allen UI-Flows

- Der Confirm-Dialog für Termin-Storno wurde im Frontend zentralisiert.
- Formular, Wochenkarte und Mehrtageskarte nutzen jetzt dieselbe Komponente und damit identische Texte/Buttons.
- Das fachliche Verhalten bleibt unverändert: alle Flows rufen weiterhin denselben Cancel-Endpunkt auf.

Zusätzlich ergänzt:

- Neue Shared-Komponente `client/src/components/AppointmentCancelConfirmDialog.tsx`
- Neuer Unit-Test `tests/unit/ui/appointmentCancelConfirmDialog.render.test.tsx`
- `docs/TEST_MATRIX.md` um den neuen Test ergänzt

Gezielte Verifikation:

- `npm run test:unit -- tests/unit/ui/appointmentCancelConfirmDialog.render.test.tsx tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
