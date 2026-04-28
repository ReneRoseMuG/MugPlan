# Auftragslog: Mitarbeiter Umsatz Übersicht

## Zweck

Umsetzung einer neuen rein lesenden Umsatzübersicht im Mitarbeiterformular. Ziel war ein zusätzliches Tab `Umsatz Übersicht` mit serverseitiger Wochenaggregation, KW-Filter und Hover-Preview.

## Scope

- Neuer Contract `GET /api/employees/:id/revenue-overview`
- Neuer serverseitiger Read-Pfad im bestehenden Mitarbeiter-Route/Controller/Service-Pfad
- Neue Aggregationslogik für qualifizierte Mitarbeitertermine
- Neues Mitarbeiter-Tab im Edit-Modus
- Neue Tabellenansicht mit sticky Header, angedocktem Filterpanel und Wochen-Preview
- Zusätzliche Unit-, Integrations- und Browser-Tests

## Technische Entscheidungen

- Rollen- und Sichtbarkeitslogik bleibt analog zu bestehenden Mitarbeiter-Detailpfaden
- Inaktive Mitarbeitende bleiben serverseitig für Nicht-`ADMIN` gesperrt
- Umsatzaggregation erfolgt serverseitig auf Basis von `appointmentsRepository.listSidebarAppointmentsByEmployeeScope(...)`
- Reklamationen werden über vorhandene Tag-Helfer ausgeschlossen
- Deduplizierung erfolgt global über die Auftragsnummer, nicht nur pro Woche
- Die UI verwendet bestehende Infrastruktur über `TableView`, `HoverPreview` und `FilterPanel`

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/employeesRoutes.ts`
- `server/controllers/employeesController.ts`
- `server/services/employeesService.ts`
- `server/services/employeeRevenueOverviewAggregation.ts`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeeRevenueOverviewTab.tsx`
- `client/src/components/EmployeeRevenueOverviewPreview.tsx`
- `tests/unit/services/employeeRevenueOverviewAggregation.test.ts`
- `tests/integration/server/employees.revenue-overview.integration.test.ts`
- `tests/unit/ui/employeeRevenueOverviewTab.test.tsx`
- `tests/unit/ui/employeeRevenueOverviewPreview.test.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `tests/e2e-browser/employee-revenue-overview.browser.e2e.spec.ts`
- `docs/EMPLOYEE_UMSATZ_UEBERSICHT_HANDOFF.md`

## Hinweise zum Testen

Ausgeführt und grün:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/services/employeeRevenueOverviewAggregation.test.ts tests/unit/ui/employeeRevenueOverviewTab.test.tsx tests/unit/ui/employeeRevenueOverviewPreview.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/employees.revenue-overview.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-revenue-overview.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Die neue Übersicht ist bewusst rein lesend; es gibt keine Export-, Schreib- oder Folgeaktionen.
- Das Handoff-Dokument bleibt als Übergabe-Artefakt im Repository erhalten und wurde mitgespeichert.
