# Auftragslog: Filter-State-Persistenz

## Zweck

Persistenz des Listenstatus fuer Projekte, Kunden, Termine und Mitarbeiter in der Hauptnavigation herstellen, damit Filter, Paging, Scope, Sortierung und der Terminlisten-Schalter "Alle Termine" beim Rueckweg aus Formularen oder Overlays nicht verloren gehen.

## Scope

- Frontend-only-Aenderung in `Home.tsx` und den vier Hauptlisten.
- Keine Backend-, Contract-, DB-, Migrations- oder Konfigurationsaenderung.
- Standalone-Views bleiben bewusst im uncontrolled-Fallback.

## Technische Entscheidungen

- Listenstatus wird zentral in `client/src/pages/Home.tsx` gehalten und controlled an `ProjectsPage`, `CustomersPage`, `AppointmentsListPage` und `EmployeesPage` weitergereicht.
- Jede der vier Listen nutzt nun ein controlled/uncontrolled-Muster:
  externe Props haben Vorrang, bestehende lokale States bleiben als Fallback erhalten.
- `useListFilters.ts` bleibt unveraendert.
- Die bestehende `Home`-Wiring-Testdatei wurde an die neue State-Struktur angepasst, weil sie an festen `useState`-Indizes hing.

## Betroffene Dateien

- `client/src/pages/Home.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/EmployeesPage.tsx`
- `tests/unit/ui/home.listStatePersistence.wiring.test.tsx`
- `tests/unit/ui/projectsPage.controlled-state.test.tsx`
- `tests/unit/ui/customersPage.controlled-state.test.tsx`
- `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx`
- `tests/unit/ui/employeesPage.controlled-state.test.tsx`
- `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx`
- `tests/unit/ui/home.behavior.test.tsx`
- `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgefuehrt:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`
- `npm run test:unit`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration --reporter=verbose`
- `npm run test:e2e`
- `npm run test:e2e:browser`

## Bekannte Einschraenkungen

- Filterpersistenz gilt innerhalb der laufenden App-Navigation, nicht ueber Browser-Reloads oder neue Tabs.
- Die Browser-Tests nutzen absichtlich echte Positiv-/Negativdaten und kurze Filterwerte dort, wo UI-Felder technisch begrenzte Laengen haben.
