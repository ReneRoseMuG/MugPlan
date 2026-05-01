# Abwesenheiten als Terminworkflow

## Zweck

Der Auftrag setzt FT-33 um: Abwesenheiten werden nicht mehr über die alte `EmployeeAbsence`-Domäne geführt, sondern als reguläre Termine modelliert. Der vorangehende separate Commit hat die alten Codepfade entfernt; die bestehende Datenbanktabelle bleibt absichtlich unangetastet.

## Scope

- Entfernt wurden die alten aktiven `EmployeeAbsence`-Codepfade aus Shared Contracts, Backend, Frontend und Testhelfern.
- Neu ergänzt wurde ein Terminworkflow für Mitarbeiter-Abwesenheiten.
- Abwesenheiten verwenden die Systemtour `Abwesenheiten`, den Systemkunden `MuG Personalplanung` und die Systemtags `Urlaub`, `Krankheit`, `Abwesend`.
- Die Mitarbeiterformular-UI enthält einen Tab `Abwesenheiten` für Anlegen, Bearbeiten und Löschen.
- Monatskalender und Wochenkalender berücksichtigen Abwesenheiten gesondert.
- Die DB-Tabelle `employee_absence` und bestehende Migrationen wurden nicht verändert.

## Technische Entscheidungen

- Abwesenheiten sind normale Einträge in `appointments` mit genau einem Mitarbeiter.
- Die Systemtags sind geschützt und im normalen Tag-Picker nicht auswählbar.
- Die Systemtour wird in der Kalenderlogik als passive Abwesenheits-Lane behandelt.
- Die Konfliktprüfung in der bestehenden Terminlogik wurde erweitert: Abwesenheiten blockieren ganztägig gegen reguläre Termine, und reguläre Termine blockieren nachträgliche Abwesenheiten.
- Mutationen laufen über neue Mitarbeiter-nahe Endpunkte unter `/api/employees/:id/absence-appointments`.
- Rollen werden serverseitig durchgesetzt: `ADMIN` und `DISPONENT` dürfen anlegen, ändern und löschen; `LESER` darf lesen.

## Betroffene Dateien

- `shared/absenceAppointments.ts`
- `shared/appointmentCancellation.ts`
- `shared/routes.ts`
- `server/services/employeeAppointmentAbsencesService.ts`
- `server/controllers/employeeAppointmentAbsencesController.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/appointmentsService.ts`
- `server/services/systemSeedService.ts`
- `server/routes/employeesRoutes.ts`
- `client/src/components/EmployeeAppointmentAbsencesPanel.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/EmployeeUtilizationView.tsx`
- `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`
- `tests/unit/shared/absenceAppointments.test.ts`

## Tests

Ausgeführt und grün:

- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project unit tests/unit/shared/absenceAppointments.test.ts`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`
- `npm run check:encoding`

Zusätzlich geprüft:

- Suche nach alten `EmployeeAbsence`-/`employee_absence`-Codepfaden in `shared`, `server`, `client`, `tests`: keine Treffer.
- Migrationen und `shared/schema.ts` blieben unverändert.

## Bekannte Einschränkungen

- `npm run lint` schlägt weiterhin an einer bestehenden ESLint-Regeldefinition in `client/src/components/NotesSection.tsx` fehl: `react-hooks/exhaustive-deps` ist nicht registriert. Das liegt außerhalb dieses Auftrags und wurde nicht geändert.
- Es wurde keine Schemaänderung vorgenommen; deshalb gibt es keine neue Migration.
