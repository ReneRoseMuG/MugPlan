# Mitarbeiter-Auslastungsansicht im Termine-Tab

## Zweck

- Im Mitarbeiterformular sollte der bestehende `Termine`-Tab um eine alternative, grafische Auslastungsansicht erweitert werden.
- Die bestehende Terminliste musste als Standard erhalten bleiben, damit der bisherige Arbeitsfluss unverändert nutzbar bleibt.

## Scope

- Neuer lokaler Toggle `Liste | Auslastung` im `Termine`-Tab des `EmployeeForm`
- Neue read-only Board-Komponente für einen festen 6-Wochen-Bereich ab aktueller ISO-Woche
- Reine Frontend-Modellierung auf Basis des bestehenden Kalender-Endpunkts `/api/calendar/appointments`
- Ergänzende Unit- und Browser-Tests sowie Pflege der `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- Kein neuer Endpunkt und keine Contract-Änderung: Die Auslastungsansicht nutzt weiter `useCalendarAppointments(...)` mit `employeeId` und `detail=full`.
- Die eigentliche Wochen-/Monats-/Segmentlogik wurde in `client/src/lib/employee-appointments-utilization.ts` als reine Hilfslogik ausgelagert, damit sie unabhängig vom Rendering testbar bleibt.
- Der `Wochenplanung`-Tab bleibt fachlich unverändert; die neue Sicht sitzt ausschließlich als Alternative innerhalb des bestehenden `Termine`-Tabs.
- Der Ansichtsmodus wird bewusst nicht persistiert. Beim Öffnen eines anderen Mitarbeiters oder eines neuen Formulars startet der Tab wieder in `Liste`.

## Betroffene Dateien

- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeeAppointmentsUtilizationBoard.tsx`
- `client/src/lib/employee-appointments-utilization.ts`
- `tests/unit/lib/employeeAppointmentsUtilization.rules.test.ts`
- `tests/unit/ui/employeeAppointmentsUtilizationBoard.wiring.test.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npm run test:unit -- tests/unit/lib/employeeAppointmentsUtilization.rules.test.ts tests/unit/ui/employeeAppointmentsUtilizationBoard.wiring.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx tests/unit/ui/employeeForm.tagsSidebar.wiring.test.tsx tests/unit/ui/employeeForm.notesSidebar.wiring.test.tsx`
  - `npm run test:e2e:browser -- tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Die Auslastungsansicht ist bewusst read-only und bietet keine Drag-and-drop- oder Direktmutationen.
- Der sichtbare Zeitraum ist fest auf 6 Wochen gesetzt und nicht mit der Filterlogik der Listenansicht gekoppelt.
- Mehrtagestermine werden pro Tag als Segment gezeigt; die Darstellung optimiert auf Sichtbarkeit der Tageslast, nicht auf eine zusammenhängende Balkenvisualisierung.
