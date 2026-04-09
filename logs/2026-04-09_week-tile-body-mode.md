# Auftragslog: week-tile-body-mode

## Zweck

Ein separates USER-Setting fuer den Body-Modus der Wochenkachel eingefuehrt. Die Steuerung wurde als dreiteiliger Toggle im Kopf der Wochenansicht links neben dem bestehenden Touren-Toggle ergaenzt.

## Scope

- Neues Setting `calendar.weekTileBodyMode` mit den Werten `collapsed`, `semiexpanded`, `expanded`
- Persistenz und Aufloesung ueber die bestehende User-Settings-Infrastruktur
- Verdrahtung in `CalendarWorkspace`, `WeekGrid` und `CalendarWeekView`
- Body-spezifische Steuerung fuer normale Wochenkacheln und Mehrtagestermine
- Tests und `docs/TEST_MATRIX.md` aktualisiert

## Technische Entscheidungen

- Die bestehende Mehrtages-Steuerung ueber `calendar.weekAppointmentDisplayMode` bleibt unveraendert.
- Das vorhandene `displayMode`-Prop von `CalendarWeekSpanningTile` wurde nicht umgedeutet, sondern nur um `weekTileBodyMode` ergaenzt.
- Der Default/Fallback fuer das neue Setting ist `semiexpanded`, damit das bisherige Verhalten der Wochenkachel erhalten bleibt.
- Fuer den Kundenblock wurde die bestehende `CustomerInfoPanel`-Mode-Logik wiederverwendet, statt eine neue Kundenpanel-Variante einzufuehren.

## Betroffene Dateien

- `server/settings/registry.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/WeekGrid.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `tests/unit/settings/useSettings.weekTileBodyMode.test.ts`
- `tests/unit/settings/weekTileBodyMode.registry.test.ts`
- `tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `tests/integration/server/userSettings.weekTileBodyMode.persistence.test.ts`
- `tests/unit/ui/calendarWeekView.headerControls.test.tsx`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`
- `tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
- `tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgefuehrt:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`
- `npm run test:unit`

## Bekannte Einschraenkungen

- Es wurde bewusst kein voller Integration-/E2E-Testlauf ausgefuehrt.
- Die Architektur-/Implementierungsdokumente ausserhalb der Test-Matrix wurden in diesem Auftrag nicht aktualisiert.
