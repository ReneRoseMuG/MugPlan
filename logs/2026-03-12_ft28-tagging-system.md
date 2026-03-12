# FT28 Tagging System

## Zweck

Umsetzung des FT28-Tagging-Systems fuer Kunden, Projekte und Termine auf Basis des bestehenden Tag-Stammdatenmodells. Ziel war die End-to-End-Erweiterung von Contracts, Serverlogik, Formularen, Listen, Karten und Wochen-Previews ohne Architekturbruch.

## Scope

- allgemeiner Anwender-Read-Endpoint `GET /api/tags`
- Tag-Relation-Endpunkte fuer Kunden, Projekte und Termine
- serverseitige Tag-Filter fuer Kunden-, Projekt- und Terminlisten
- Tag-Daten in Kunden-/Projektdetails sowie in Termin-Detail, Terminliste und Kalenderaggregation
- wiederverwendbare Tag-UI (`TagBadge`, `TagPickerPanel`, Filterinput, Footer-Zeile)
- Einbindung in `CustomerData`, `ProjectForm`, `AppointmentForm`
- sichtbare Tag-Zeilen in Kunden-/Projektkarten und in `CalendarWeekAppointmentPanel`
- FT28-Unit-Tests und Pflege von `docs/TEST_MATRIX.md` sowie `docs/UI-Komponenten-Referenz.md`

Nicht umgesetzt in diesem Schritt:

- neue Migrationen
- Admin-Tag-CRUD-Anpassungen
- volle Browser-/Integrationstest-Erweiterung des FT28-Plans

## Technische Entscheidungen

- Server blieb strikt im bestehenden Schichtenmodell Route -> Controller -> Service -> Repository.
- Tag-Zuweisungen laufen ueber einen gemeinsamen Server-Baustein in:
  - `server/repositories/tagRelationsRepository.ts`
  - `server/services/tagRelationsService.ts`
- Listenfilter bleiben serverseitige Wahrheit; der Client sendet nur `tagIds`.
- Kalender-/Preview-Daten wurden um `appointmentTags`, `customerTags`, `projectTags` erweitert, damit keine zusaetzlichen UI-Requests pro Karte entstehen.
- Clientseitige Deduplizierung fuer Wochenkarten erfolgt zentral ueber `mergeUniqueTags()` in `client/src/lib/tag-utils.ts`.
- Query-Invalidierung fuer Tag-Mutationen wurde zentralisiert in `client/src/lib/tag-invalidation.ts`, um Kalender-, Listen- und Projektion-Queries gemeinsam nachzuziehen.
- Reusable UI folgt bestehenden Mustern:
  - `TagBadge` auf Basis von `ColoredInfoBadge`
  - `TagPickerPanel` auf Basis von `SidebarChildPanel` und `EntityEditDialog`
  - `TagFilterInput` analog zum bestehenden Status-Filtermuster

## Betroffene Dateien

Wesentliche neue Dateien:

- `server/repositories/tagRelationsRepository.ts`
- `server/services/tagRelationsService.ts`
- `server/controllers/tagsController.ts`
- `server/routes/tagsRoutes.ts`
- `client/src/components/TagPickerPanel.tsx`
- `client/src/components/filters/tag-filter-input.tsx`
- `client/src/components/ui/tag-badge.tsx`
- `client/src/components/ui/badge-previews/tag-badge-preview.tsx`
- `client/src/components/ui/entity-tag-footer-row.tsx`
- `client/src/lib/tag-utils.ts`
- `client/src/lib/tag-invalidation.ts`
- `tests/unit/lib/tag-utils.test.ts`
- `tests/unit/ui/tagBadge.ui.test.tsx`
- `tests/unit/ui/tagPickerPanel.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.tags.wiring.test.tsx`

Wesentliche geaenderte Dateien:

- `shared/routes.ts`
- `server/repositories/customersRepository.ts`
- `server/repositories/projectsRepository.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/customersService.ts`
- `server/services/projectsService.ts`
- `server/services/appointmentsService.ts`
- `server/controllers/customersController.ts`
- `server/controllers/projectsController.ts`
- `server/controllers/appointmentsController.ts`
- `server/routes/customersRoutes.ts`
- `server/routes/projectsRoutes.ts`
- `server/routes/appointmentsRoutes.ts`
- `server/routes.ts`
- `client/src/components/CustomerData.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/ui/filter-panels/customer-filter-panel.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `client/src/components/ui/filter-panels/appointments-filter-panel.tsx`
- `client/src/lib/customer-filters.ts`
- `client/src/lib/project-filters.ts`
- `client/src/lib/calendar-appointments.ts`
- `docs/TEST_MATRIX.md`
- `docs/UI-Komponenten-Referenz.md`

## Hinweise zum Testen

Ausgefuehrt:

- `npx tsc --noEmit`
- `npm run test:unit -- tests/unit/lib/tag-utils.test.ts tests/unit/ui/tagBadge.ui.test.tsx tests/unit/ui/tagPickerPanel.wiring.test.tsx tests/unit/ui/calendarWeekAppointmentPanel.tags.wiring.test.tsx`

Ergebnis:

- TypeScript-Compile erfolgreich
- 4 gezielte Unit-Testdateien erfolgreich
- 10/10 Tests gruen

Vor dem Testlauf geprueft:

- `../../shared/.env.test` ist vorhanden
- Testlauf erfolgte mit `NODE_ENV=test` und `MUGPLAN_MODE=test` ueber `npm run test:unit`

## Bekannte Einschraenkungen

- `npm run check` ist weiterhin nicht voll gruen, aber wegen eines bestehenden aufgabenfremden Blockers:
  - `script/sql/2026-03-11_recreate_server_schema_from_repo.sql` fehlt in `docs/TEST_DB_SAFETY_INVENTORY.md`
- Der volle FT28-Plan sah auch breite Integration-/Browsertests vor; in diesem Schritt wurden nur gezielte Unit-Tests fuer die neuen Tag-Bausteine ergaenzt.
- Die Hilfe-Key-Zuordnung fuer neue Tag-Filter und Picker wurde nicht funktional erweitert; die Doku wurde aktualisiert, aber neue HelpText-Inhalte wurden nicht angelegt.
