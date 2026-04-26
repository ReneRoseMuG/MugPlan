# Terminlisten-Datumsfokus und Monitoring

## Zweck

Die Terminlisten in Navigation, Tour-Formular und Mitarbeiter-Formular sollten nicht mehr blind beim frühesten historischen Treffer starten, sondern direkt den ersten Termin ab heutigem Berliner Datum fokussieren. Zusätzlich sollte Monitoring den nächstliegenden Treffer sichtbar hervorheben. Die Änderung wurde zusammen mit einer erweiterten Testsuite umgesetzt, damit Paging-, Filter- und Kontextregressionen früh erkennbar bleiben.

## Scope

- Datumsnaher Initialfokus für:
  - Navigation `Termine`
  - `Tour Termine`
  - `Mitarbeiter Termine`
- Zusätzliche Fokus-Hervorhebung für `Monitoring`
- Erweiterung des API-Vertrags von `/api/appointments/list`
- Ergänzung und Anpassung von Unit-, Integrations- und Browser-E2E-Tests entlang der betroffenen Pfade

Nicht geändert:

- Fachliche Sortierung der Terminliste
- Rollen- und Berechtigungslogik
- Wochenlisten mit festem Datumsbereich (`fixedDateRange`)

## Technische Entscheidungen

- Der Fokusanker wird serverseitig bestimmt, damit Paging und Filter mit derselben Datenbasis berechnet werden wie die eigentliche Liste.
- `/api/appointments/list` liefert dafür `focusAppointment` mit Zieltermin, Zielseite und Position auf der Zielseite.
- Der Fokus bezieht sich auf den ersten Termin mit `startDate >= heutiges Berliner Datum`.
- Der Auto-Sprung wird nur für `scope=all` und nur außerhalb fester Datumsfenster verwendet.
- Gibt es keinen heutigen oder zukünftigen Treffer, bleibt die bestehende Historienlogik erhalten.
- Monitoring berechnet den Fokus lokal aus der bereits gefilterten Treffermenge und ergänzt nur eine zusätzliche Outline zur bestehenden Triggerfarbe.

## Betroffene Dateien

- `shared/routes.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/appointmentsService.ts`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/MonitoringPage.tsx`
- `tests/integration/server/appointments.list.sorting.integration.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`
- `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts`
- `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx`
- `tests/unit/ui/appointmentsListPage.fixedDateRange.wiring.test.tsx`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:run -- tests/unit/ui/appointmentsListPage.controlled-state.test.tsx tests/unit/ui/appointmentsListPage.fixedDateRange.wiring.test.tsx tests/unit/ui/monitoringPage.behavior.test.tsx`
- `npm run test:integration -- tests/integration/server/appointments.list.sorting.integration.test.ts tests/integration/server/monitoring.ft31.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`

Neu bzw. erweitert abgesichert:

- Navigation startet bei gemischten historischen/zukünftigen Daten direkt auf der Seite des ersten künftigen Treffers.
- Tour- und Mitarbeiter-Terminlisten verhalten sich im Formular-Kontext genauso.
- Historien-only-Mengen erzeugen keinen falschen Zukunftsfokus.
- Rückweg aus dem Termin-Overlay hält Filter und Fokusseite stabil.
- Monitoring markiert den nächstliegenden gefilterten Treffer zusätzlich zur Triggerfarbe.
- API-Fokusmetadaten bleiben über Tour-, Mitarbeiter-, Datums- und Mehrseitenfälle vertraglich abgesichert.

## Bekannte Einschränkungen

- Die Fokuslogik greift bewusst nicht in Listen mit `fixedDateRange` ein, damit feste Wochen- oder Zeitraumskontexte nicht heimlich verlassen werden.
- Die Fokusmarkierung in Monitoring wird browserseitig über `box-shadow` geprüft; die genaue CSS-Serialisierung ist Browser-Engine-abhängig, die fachliche Hervorhebung bleibt davon aber unberührt.
- Für die neuen Guard-Tests wurde keine zusätzliche DOM-Testumgebung eingeführt; die Absicherung bleibt primär auf echter API-/Browser-Ebene, ergänzt um bestehende serverseitige UI-Wiring-Tests.
