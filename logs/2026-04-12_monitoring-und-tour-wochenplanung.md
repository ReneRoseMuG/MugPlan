# Log: Monitoring-Trigger 02, Doppeltrigger-Verdichtung und Tour-Wochenplanung

**Datum:** 2026-04-12  
**Branch:** `feature/monitoring-tr02-geparkt`  
**Auftragsklasse:** 5 für die Monitoring-Erweiterung, danach mehrere Klasse-4-Nachschärfungen

---

## Zweck

Diese Session hatte vier inhaltliche Blöcke:

1. das Monitoring von einem Trigger auf zwei Trigger erweitern
2. die Darstellung von Doppeltriggern fachlich eindeutiger machen
3. einen Regressionsfehler beim Parken im Kalender beheben
4. den Einstieg in die Tour-Wochenplanung von einem Footer-Button in die Sidebar verlagern

Zusätzlich wurden Hover-Previews, Sidebar-Pills, Kalender-Hervorhebungen und die begleitende Testsuite für die neuen Monitoring-Pfade mitgezogen.

---

## Scope

Bearbeitet wurden:

- Monitoring-Contract, Monitoring-Service und Summary-Aggregation
- Monitoring-UI, Kalender-Hervorhebung und Sidebar-Pills
- Browser-, Unit- und Integrationstests für FT31 und angrenzende FT06-/FT04-Pfade
- Parken aus Kalenderkarten mit sofortiger Monitoring-Aktualisierung
- Tour-Wochenplanung: `KW einfügen` aus dem Footer in die Sidebar verschoben

Nicht bearbeitet wurden:

- neue Architektur oder neue Endpunkte
- Build-, Tooling- oder Dependency-Änderungen
- größere Refactorings außerhalb des unmittelbar betroffenen Bereichs

---

## Technische Entscheidungen

- `TR-01` steht weiter für `Mindestzahl Mitarbeiter`, `TR-02` für `Geparkt`.
- Monitoring-Items bleiben farb- und prioritätsfähig über `triggerCode`, tragen aber zusätzlich `triggerCodes`, damit mehrere Ursachen pro Termin in genau einer Zeile transportiert werden können.
- Die Tabellenanzeige für Doppeltrigger wurde bewusst auf eine kombinierte Kurzform verdichtet:
  `Mindestzahl Mitarbeiter + Geparkt`
- Die Kalender-Hervorhebung bleibt priorisiert auf dem Primärtrigger. Für Doppeltrigger gewinnt `TR-01`.
- Die Geparkt-Farbe wird zentral aus gemeinsam genutzten Konstanten bezogen und nicht lokal dupliziert.
- Der Park-Flow aus dem großen Terminformular und aus den Wochenkarten wurde auf denselben Monitoring-Refresh-Mechanismus vereinheitlicht.
- Der frühere Footer-Button `KW einfügen` wurde aus der Tour-Wochenplanung entfernt und als Sidebar-Toggle unter `Neue Wochenplanung` platziert.

---

## Betroffene Dateien

### Shared / Contract

- `shared/monitoring.ts`
- `shared/routes.ts`

### Backend

- `server/services/monitoringService.ts`

### Frontend Monitoring / Kalender / Navigation

- `client/src/lib/monitoring.ts`
- `client/src/lib/monitoring-ui.ts`
- `client/src/pages/Home.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/components/MonitoringPage.tsx`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/WeekGrid.tsx`
- `client/src/components/MonthSheetGrid.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`

### Tour-Wochenplanung

- `client/src/components/TourEditForm.tsx`

### Tests / Doku

- `tests/unit/services/monitoringService.ft31.test.ts`
- `tests/unit/lib/monitoring.test.ts`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/e2e-browser/appointment-park.workflow.browser.e2e.spec.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

---

## Umgesetzte Änderungen

### Monitoring Trigger 02

- Monitoring erkennt jetzt zusätzlich alle aktuellen und zukünftigen Termine mit dem System-Tag `Geparkt`.
- Stornierte und historische Termine bleiben für beide Trigger ausgeschlossen.
- Die Spalte `Problem` wurde entfernt.
- Die Monitoring-Tabelle zeigt nur noch `Startzeit`, `Startdatum`, `Tour` und `Trigger`.
- Zeilen werden triggerabhängig eingefärbt:
  - `TR-01` rot abgeschwächt
  - `TR-02` in abgeschwächter Geparkt-Farbe

### Doppeltrigger-Verdichtung

- Vorher erzeugte ein Termin mit `TR-01` und `TR-02` zwei Zeilen.
- Jetzt erzeugt derselbe Termin genau eine Zeile mit:
  - `triggerCode` = Primärtrigger
  - `triggerCodes` = alle zutreffenden Trigger
  - `triggerName` = kombinierter Kurztext
- Summary und Sidebar-Pills zählen trotzdem triggerweise korrekt weiter.

### Kalender und Sidebar

- Die Konflikt-Hervorhebung im Kalender arbeitet jetzt mit triggerbezogenen Metadaten statt nur mit Termin-IDs.
- Die Monitoring-Pills wurden unter `Monitoring` in der Navigation eingegliedert.
- Die Hover-Preview der Monitoring-Tabelle zeigt wieder die reguläre Termin-Preview pro Zeile.

### Parken und Monitoring-Freshness

- Beim Parken im großen Terminformular war das Monitoring bereits korrekt verdrahtet.
- Beim Parken direkt aus Wochenkarten und Mehrtagestiles fehlte dieser Refresh.
- Beide Kalender-Parkpfade triggern jetzt ebenfalls `refreshMonitoringWithNotification(...)`.

### Tour-Wochenplanung

- `KW einfügen` wurde aus dem Footer entfernt.
- Stattdessen gibt es in der Sidebar im Wochenplanungs-Tab den Block `Neue Wochenplanung`.
- Der Header dieses Blocks ist bewusst ohne Icon.
- Der Toggle selbst bleibt mit passendem Wochen-Icon und Tour-Farbe gestaltet.

---

## Test- und Verifikationsstand

Gezielt ausgeführt und erfolgreich:

- `npm run typecheck`
- `npx vitest run tests/unit/services/monitoringService.ft31.test.ts tests/unit/lib/monitoring.test.ts tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/monitoringPage.behavior.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `npx vitest run tests/integration/server/monitoring.ft31.integration.test.ts --reporter=verbose`
- `npx playwright test tests/e2e-browser/appointment-park.workflow.browser.e2e.spec.ts`
- `npx vitest run tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `npx playwright test tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

Zusätzlich wurden zwischenzeitliche Regressionspunkte einzeln nachvollzogen und direkt nach Fix erneut geprüft.

---

## Bekannte Hinweise

- Die Tour-Wochenplanung wurde funktional auf Sidebar-Einstieg umgestellt. Die eigentliche Wochenkartenlogik blieb unverändert.
- Während der Session gab es eine Zwischenphase, in der die Wochenplanung visuell missverständlich wirkte. Am Ende wurden die Browser-Flows erfolgreich geprüft.
- Ein voller Audit und ein voller Testlauf über die komplette Pflichtstrecke wurden in dieser Session nicht erneut als Gesamtlauf ausgeführt, sondern nur gezielt die betroffenen Pfade.

---

## Nächste sinnvolle Schritte

1. Falls gewünscht, vollen Audit und vollen Testlauf über Abschnitt 12 ausführen.
2. Danach optional `docs-sync`, falls die Monitoring-/Kalender-Doku formal nachgezogen werden soll.
3. Anschließend den Branch entweder weiter sammeln oder per `cleanup` nach Freigabe sauber in `work` überführen.
