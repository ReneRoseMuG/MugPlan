# Auftragslog

## Zweck
Monatskalender und Auslastungsübersicht im Mitarbeiterformular sollten navigativ vereinheitlicht werden. Ziel war, den KW-Sprung aus dem Wochenkalender in den Monatskalender zu übernehmen und die Auslastungsübersicht auf exakt dieselbe Navigationslogik umzustellen.

## Scope
- KW-Sprung im Monatskalender aktiviert, inklusive Rücksprung auf die vorherige Position
- Gemeinsames Kalender-Footer-Panel so erweitert, dass der KW-Sprung auch ohne Mitarbeiterfilter genutzt werden kann
- Eigene Blätter-Buttons der Auslastungsübersicht entfernt und durch Monatskalender-Navigation ersetzt
- Betroffene Unit- und Browser-Tests auf das neue Verhalten angepasst

## Technische Entscheidungen
- Bestehende KW-Sprung-Logik in `client/src/components/CalendarWorkspace.tsx` wiederverwendet und auf `month` sowie `monthSheet` erweitert, statt eine zweite Monatsvariante einzubauen
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx` minimal verallgemeinert, damit derselbe Footer sowohl mit als auch ohne Mitarbeiterfilter funktioniert
- `client/src/components/EmployeeUtilizationView.tsx` an die Monatskalender-Navigation angenähert, statt die bisherige Sondernavigation weiterzupflegen

## Betroffene Dateien
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/EmployeeUtilizationView.tsx`
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
- `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`
- `tests/unit/ui/employeeUtilizationView.wiring.test.tsx`
- `tests/e2e-browser/calendar.kw-jump.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`

## Hinweise zum Testen
- `npm run test:unit -- tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx tests/unit/ui/employeeUtilizationView.wiring.test.tsx tests/unit/ui/calendarFilterPanel.kwJump.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar.kw-jump.browser.e2e.spec.ts tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`
- `npm run typecheck`

## Bekannte Einschränkungen
- Keine fachlichen Einschränkungen bekannt
- Die Änderung betrifft nur Frontend-Navigation und UI-Wiring; Serververhalten und Rollenlogik wurden bewusst nicht verändert
