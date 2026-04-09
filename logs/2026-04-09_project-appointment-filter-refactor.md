# Auftragslog: Projekt- und Terminfilter-Refactor

## Zweck

Die Standard-Filterlogik für Projekte und Termine wurde auf eine explizite und fachlich konsistente Semantik umgestellt.

- Termine starten jetzt ungefiltert mit der vollständigen Terminmenge.
- Projekte starten jetzt mit der vollständigen Projektmenge.
- Die bisherigen missverständlichen Switches wurden durch explizite Toggles ersetzt.
- Die serverseitige Projektscope-Semantik wurde geradegezogen, sodass `scope=all` wirklich alle Projekte liefert.

Arbeitsbranch: `refactor-project-appointment-filters`

## Scope

Umgesetzt wurden Änderungen in diesen Bereichen:

- Shared Contract für Projekt-Scopes
- Serverlogik für Projektlisten-Semantik
- Frontend-Defaults und Filter-UI für Projekt- und Terminlisten
- Home-Listenstände
- Terminformular-Projektpicker im neuen Scope-Verständnis
- Unit-, Integrations- und Browser-Tests
- Test-Matrix-Dokumentation

Nicht Bestandteil:

- Datenmodell- oder Schemaänderungen
- Persistenzformat oder Relationen
- Änderungen an Rollen-, Locking- oder Termin-Invarianten

## Technische Entscheidungen

1. `scope=all` wurde serverseitig auf die echte Vollmenge umgestellt.
2. Für die bisherige Menge "Projekte mit mindestens einem Termin" wurde `scope=withAppointments` eingeführt.
3. Die Projektliste nutzt UI-seitig nur die fachlich benötigten drei sichtbaren Scopes: `all`, `upcoming`, `noAppointments`.
4. Die Terminliste nutzt UI-seitig einen expliziten Scope statt des alten Bool-Switches: `all`, `planned`.
5. Die geplante Terminmenge bleibt minimal-invasiv an die bestehende `dateFrom=today`-Logik gekoppelt.
6. Bestehende Browser-Tests wurden auf stabile Test-IDs der neuen Toggles umgestellt.
7. Zusätzlich wurden zwei dedizierte Browser-Specs für reale Past-/Future-/No-Match-Mengen gebaut.

## Betroffene Dateien

### Produktivcode

- `shared/routes.ts`
- `server/services/projectsService.ts`
- `server/repositories/projectsRepository.ts`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/TagPickerPanel.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `client/src/components/ui/filter-panels/appointments-filter-panel.tsx`
- `client/src/pages/Home.tsx`

### Tests

- `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`
- `tests/integration/server/appointments.cancellation.integration.test.ts`
- `tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`
- `tests/unit/ui/projectsPage.controlled-state.test.tsx`
- `tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`
- `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx`
- `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
- `tests/unit/ui/home.listStatePersistence.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.relationSlots.test.tsx`
- `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`
- `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts`
- `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`
- `tests/e2e-browser/attachment-context-invalidation.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-multiday-edit.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-with-article-list.browser.e2e.spec.ts`
- `tests/e2e-browser/docs-followup.mojibake-regression.browser.e2e.spec.ts`
- `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`

### Dokumentation

- `docs/TEST_MATRIX.md`

## Abschlussstand Tests und Audit

Der abschließende Audit ist vollständig grün gelaufen:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Der abschließende volle Testlauf ist vollständig grün gelaufen:

- `npm run test:unit`
- `npm run test:integration -- --reporter=verbose`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Besonders abgesichert wurden zusätzlich die neuen Filtermengen über:

- `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Die sichtbare Termin-Scope-Logik `planned` bleibt intern an die bestehende Datumsuntergrenze `heute` gekoppelt. Das ist bewusst minimal-invasiv und keine neue tiefere Datumsmodellierung.
- Es wurden gezielt nur zum Auftrag gehörende Testpfade und Selektoren umgestellt; weitergehender Refactoring-Bedarf außerhalb dieses Scopes wurde nicht umgesetzt.
- In den Testläufen erscheint weiterhin nur eine nicht blockierende `node-cron`-Sourcemap-Warnung aus `node_modules`.
