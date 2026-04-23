# Auftragslog: Leser UI Readonly Release

## Zweck

Die UI sollte für die Rolle `READER` fachlich als Leser-/Readonly-Modus freigegeben werden. Dabei mussten bestehende Lesepfade erhalten bleiben, mutierende UI-Aktionen aber konsequent verschwinden oder deaktiviert werden. Zusätzlich sollte `Monitoring` für Leser sichtbar werden, während `Tour KW/PLZ Planung` für Leser aus der Navigation verschwindet.

## Scope

- Rollenbezogene UI-Anpassungen in Navigation, Home-Views und Standalone-Views
- Readonly-Durchzug für Termine, Kalender, Projekte, Kunden, Mitarbeiter, Touren und Wochenplanung
- Gezielte Erweiterung der Monitoring-Lesefreigabe für Leser
- Anpassung und Ergänzung von Unit-, Integration- und Browser-Tests je Umsetzungsgruppe
- Keine neuen Architektur- oder Contract-Änderungen außerhalb der für Monitoring nötigen serverseitigen Lesefreigabe

## Technische Entscheidungen

- Die Reader-Logik wurde im Frontend zentralisiert über `client/src/lib/auth.ts`, damit Rollenprüfungen nicht erneut uneinheitlich in einzelnen Screens entstehen.
- Für bestehende Formulare und Panels wurden vorhandene `readOnly`-/`canEdit`-Mechaniken bevorzugt wiederverwendet, statt parallele Sonderpfade einzuführen.
- Globale Neuanlage-Einstiege werden für Leser bereits an den Listen- und Navigationspunkten entfernt, damit keine mutierenden Flows mehr startbar sind.
- Deep-Open- und Lesepfade bleiben erhalten: Leser können bestehende Datensätze, Kalenderansichten, Wochenkarten und Monitoring weiter öffnen.
- `Monitoring` wurde bewusst auch serverseitig für die Leserrolle freigegeben, weil es sich nicht nur um eine reine Sichtbarkeitsfrage in der UI handelt.
- Tour- und Wochenplan-Mutationen wurden sowohl im Tourformular als auch im gemeinsamen Wochenformular explizit auf `readOnly` umgestellt, damit keine Nebenpfade über Wochenkarten, Picker oder Notizaktionen offen bleiben.

## Betroffene Dateien

- Rollen und Navigation:
  `client/src/lib/auth.ts`, `client/src/lib/monitoring.ts`, `client/src/components/Sidebar.tsx`, `client/src/pages/Home.tsx`, `client/src/pages/StandaloneDomainViews.tsx`, `server/services/monitoringService.ts`
- Termine und Kalender:
  `client/src/components/AppointmentForm.tsx`, `client/src/components/CalendarWorkspace.tsx`, `client/src/components/WeekGrid.tsx`, `client/src/components/MonthSheetGrid.tsx`, `client/src/components/calendar/CalendarWeekView.tsx`, `client/src/components/calendar/CalendarMonthSheetView.tsx`, `client/src/components/calendar/CalendarYearView.tsx`
- Projekte:
  `client/src/components/ProjectsPage.tsx`, `client/src/components/ProjectForm.tsx`, `client/src/components/ProjectAppointmentsPanel.tsx`, `client/src/components/ProjectAttachmentsPanel.tsx`, `client/src/components/ProjectOrderForm.tsx`, `client/src/components/RichTextEditor.tsx`
- Kunden:
  `client/src/components/CustomersPage.tsx`, `client/src/components/CustomerData.tsx`, `client/src/components/CustomerAttachmentsPanel.tsx`
- Mitarbeiter:
  `client/src/components/EmployeesPage.tsx`, `client/src/components/EmployeeForm.tsx`, `client/src/components/EmployeeAttachmentsPanel.tsx`
- Touren und Wochenplanung:
  `client/src/components/TourManagement.tsx`, `client/src/components/TourEditForm.tsx`, `client/src/components/TourWeekForm.tsx`
- Testmatrix und Tests:
  `docs/TEST_MATRIX.md` sowie die ergänzten Reader-Unit-/Integration-/Browser-Suites in `tests/unit`, `tests/integration/server` und `tests/e2e-browser`

## Hinweise zum Testen

- Erfolgreich gruppenweise ausgeführt wurden unter anderem:
  `npm run test:unit -- tests/unit/ui/sidebar.behavior.test.tsx tests/unit/lib/monitoring.test.ts tests/unit/services/monitoringService.ft31.test.ts tests/unit/ui/home.behavior.test.tsx`
  `npm run test:integration -- --reporter=verbose tests/integration/server/monitoring.ft31.integration.test.ts`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-navigation.browser.e2e.spec.ts`
  `npm run test:unit -- tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/home.behavior.test.tsx tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx tests/unit/ui/calendarYearView.readerReadOnly.test.tsx tests/unit/ui/calendarMonthSheetView.wiring.test.tsx tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts`
  `npm run test:unit -- tests/unit/ui/projectForm.layoutShellIntegration.test.tsx tests/unit/ui/projectForm.customerRelationSlot.test.tsx`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts`
  `npm run test:unit -- tests/unit/ui/customerData.layoutShellIntegration.test.tsx tests/unit/ui/customerData.tagsSidebar.wiring.test.tsx tests/unit/ui/customersPage.controlled-state.test.tsx tests/unit/ui/customersPage.readerReadonly.test.tsx tests/unit/ui/home.behavior.test.tsx`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`
  `npm run test:unit -- tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx tests/unit/ui/employeeForm.notesSidebar.wiring.test.tsx tests/unit/ui/employeesPage.controlled-state.test.tsx tests/unit/ui/employeesPage.readerReadonly.test.tsx`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts`
  `npm run test:unit -- tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourWeekForm.render.test.tsx`
  `npm run test:e2e:browser -- tests/e2e-browser/reader-tours-readonly.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Es wurde kein vollständiger Repository-Gesamttestlauf gestartet; die Ausführung erfolgte bewusst gruppenweise über die fachlich relevanten Ziel-Suites.
- Die Maßnahme ist primär ein Release-Fix für das Rollenverhalten in UI und zugehörigen Lesepfaden. Sie ersetzt keine generelle Sicherheitsüberprüfung aller Endpunkte.
- Für Monitoring war eine serverseitige Lesefreigabe notwendig; für andere Domänen blieb der Fokus auf den beauftragten UI-/Flow-Sperren.
