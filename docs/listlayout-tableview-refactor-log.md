# Phase 1 Refactor Log: ListLayout Architecture Infrastructure

Date: 2026-02-12
Branch: `refactor/listlayout-architecture`

## New Files
- `client/src/components/ui/list-layout.tsx`
- `client/src/components/ui/board-view.tsx`
- `client/src/components/ui/table-view.tsx`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

## New Components
- `ListLayout`
- `BoardView`
- `TableView<T>`

## Decisions
- Implemented `ListLayout` as shell-only component with strict slot model:
  - Header (title/icon/help/optional close)
  - optional `filterSlot`
  - required `contentSlot`
  - optional `footerSlot`
  - optional `viewModeToggle`
- Implemented `BoardView` as standalone grid renderer with visual class parity to existing card-grid behavior:
  - same responsive grid class logic based on `cardListColumns`
  - same spacing model (`p-6`, `gap-4`, optional `toolbar` margin)
- Implemented `TableView<T>` as generic typed table:
  - typed `columns` and `rows`
  - optional `rowPreviewRenderer` (integrated with existing `HoverPreview`)
  - no `onRowClick` API
  - `onRowDoubleClick` only

## Deviations and Justification
- No functional deviations from requested Phase-1 scope.
- Additional optional styling hooks (`className`, `contentClassName`, `rowClassName`, etc.) were added to improve future migration flexibility without touching existing screens.

## Compliance Notes
- No existing file was modified.
- Explicitly untouched (as requested):
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
  - existing pages, filters, screens, routing, and other components
- `CardListLayout` was not adapted and is not used internally by new components.

## Test Points
- TypeScript compile check:
  - command: `npm run check`
  - result: passed
- Structural manual checks for migration phase readiness:
  - `ListLayout` renders all slots in expected order.
  - `BoardView` grid class resolution behaves as expected for `gridCols="2"` and dynamic columns.
  - `TableView` supports typed column rendering, empty-state row, row double-click, and hover previews.

## Phase 2: HelpTextsPage Migration (2026-02-12)

### Migration Scope
- Migrated only `HelpTextsPage` to new list architecture:
  - `ListLayout`
  - `BoardView`
  - `TableView`
- No other screen was migrated.

### Changed Files
- `client/src/components/HelpTextsPage.tsx`
- `client/src/components/ui/list-layout.tsx`
- `server/settings/registry.ts`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Implementation Notes
- Replaced `CardListLayout` usage in `HelpTextsPage` with:
  - `ListLayout` shell (`viewModeKey="helptexts"`, filter slot, content slot, footer action)
  - `BoardView` for card grid mode (same card components/interactions)
  - `TableView` for tabular mode
- Added view mode toggle (`board`/`table`) in header.
- Persisted view mode through existing settings system key `helptexts.viewMode` (`USER` scope, default `board`).
- Table mode implementation:
  - sortable column `Key`
  - sortable column `Inhalt vorhanden` (`Ja/Nein`)
  - hover preview via `rowPreviewRenderer`
  - open edit dialog on row double click
  - no single-click behavior

### Compliance Confirmation
- Existing components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No adapter/wrapper strategy was introduced.
- No endpoint changes, no routing changes, no data-fetch logic changes for help texts query.
- No additional screen migration was performed.

### Test Points (Phase 2)
- Board mode renders existing help text cards in the same grid configuration (`gridCols="2"` + `cardListColumns` behavior in `BoardView`).
- Table mode renders required columns and sorting behavior.
- Hover preview renders formatted content or missing-content message.
- Double-click on table row opens edit dialog.
- View mode toggle persists and does not trigger help-text query key changes.

## Phase 3: ProjectsPage Migration (2026-02-12)

### Migration Scope
- Migrated only `ProjectsPage` (project list screen) to new list architecture:
  - `ListLayout`
  - `BoardView`
  - `TableView`
- Other screens were not migrated.
- Existing picker flows continue to use `ProjectList` unchanged.

### Changed Files
- `client/src/components/ProjectsPage.tsx` (new)
- `client/src/pages/Home.tsx`
- `server/settings/registry.ts`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Implementation Notes
- Added dedicated `ProjectsPage` and integrated it for `view === "projectList"` in `Home`.
- Added view mode persistence key `projects.viewMode` (`USER`, default `board`).
- `ProjectsPage` structure:
  - `ListLayout` shell with `viewModeKey="projects"`
  - existing `ProjectFilterPanel` in `filterSlot`
  - `BoardView` with unchanged project cards and interactions
  - `TableView` with required sortable columns:
    - `Titel`
    - `Kunde`
    - `Relevanter Termin`
- Relevant appointment calculation in table rows:
  1. nearest future appointment
  2. else latest historical appointment
  3. else `—`
- Row preview behavior:
  - shows relevant appointment preview on hover
  - shows `Keine Termine vorhanden.` when absent
- Row interaction in table:
  - double click opens project edit flow (`onSelectProject`)
  - single click has no action

### Compliance Confirmation
- Existing layout components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No adapter/wrapper strategy was introduced.
- No routing structure changes (existing `projectList` view path retained).
- No backend endpoint changes.
- No change to backend relevant-appointment logic.

### Test Points (Phase 3)
- Board mode keeps previous project card rendering and behavior.
- Table mode renders required columns and sorting.
- Relevant appointment resolution follows required priority rule.
- Hover preview shows appointment details or fallback text.
- Double-click opens edit flow.
- View mode switch does not change project list query key (`/api/projects?...`) and does not trigger a project data reload by mode alone.

## Phase 4: CustomersPage Migration (2026-02-12)

### Migration Scope
- Migrated only `CustomersPage` (customer list screen) to new list architecture:
  - `ListLayout`
  - `BoardView`
  - `TableView`
- Other screens were not migrated.
- Existing picker flows continue to use `CustomerList` unchanged.

### Changed Files
- `client/src/components/CustomersPage.tsx` (new)
- `client/src/pages/Home.tsx`
- `server/settings/registry.ts`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Implementation Notes
- Added dedicated `CustomersPage` and integrated it for `view === "customerList"` in `Home`.
- Added view mode persistence key `customers.viewMode` (`USER`, default `board`).
- `CustomersPage` structure:
  - `ListLayout` shell with `viewModeKey="customers"`
  - existing `CustomerFilterPanel` in `filterSlot`
  - `BoardView` with unchanged customer cards and interactions
  - `TableView` with required sortable columns:
    - `Kundennummer`
    - `Name`
    - `Vorname`
    - `Relevanter Termin`
  - plus non-sort columns:
    - `Telefon`
    - `E-Mail`
- Relevant appointment calculation in table rows:
  1. nearest future appointment
  2. else latest historical appointment
  3. else `Keine Termine geplant`
- Row preview behavior:
  - shows relevant appointment preview on hover
  - shows `Keine Termine geplant` when absent
- Row interaction in table:
  - double click opens customer edit flow (`onSelectCustomer`)
  - single click has no action

### Compliance Confirmation
- Existing layout components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No adapter/wrapper strategy was introduced.
- No routing structure changes (existing `customerList` view path retained).
- No backend endpoint changes.
- No change to backend appointment-calculation logic.

### Test Points (Phase 4)
- Board mode keeps previous customer card rendering and behavior.
- Table mode renders required columns and sorting.
- Relevant appointment resolution follows required priority rule.
- Hover preview shows appointment details or fallback text.
- Double-click opens edit flow.
- View mode switch does not change customer list query key (`/api/customers`) and does not trigger a customer data reload by mode alone.

## Phase 5a: ProjectsPage Table Sort Fix (2026-02-12)

### Scope
- Only adjusted sorting behavior in `ProjectsPage` table configuration.
- No structural changes, no migration changes.

### Changed Files
- `client/src/components/ProjectsPage.tsx`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Fix Details
- Removed `Relevanter Termin` from client-side sort key union and sort branch.
- Changed `Relevanter Termin` table header to static text (no sort button, no sort indicator).
- Sorting for other columns (`Titel`, `Kunde`) remains unchanged.

### Compliance Confirmation
- Existing layout components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No backend changes, no endpoint changes, no adapter logic.
- Relevant appointment calculation logic remains unchanged.

### Test Points (Phase 5a)
- No sort icon shown for `Relevanter Termin`.
- Sorting still works for other sortable columns.
- View mode switching behavior unchanged and does not trigger mode-based data reload.

## Phase 5: EmployeesPage Migration (2026-02-12)

### Migration Scope
- Migrated only `EmployeesPage` (employee screen) to new list architecture:
  - `ListLayout`
  - `BoardView`
  - `TableView`
- Other screens were not migrated.
- Existing picker flows continue to use `EmployeeListView` unchanged.

### Changed Files
- `client/src/components/EmployeesPage.tsx` (new)
- `client/src/pages/Home.tsx`
- `server/settings/registry.ts`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Implementation Notes
- Added dedicated `EmployeesPage` and integrated it for `view === "employees"` in `Home`.
- Added view mode persistence key `employees.viewMode` (`USER`, default `board`).
- `EmployeesPage` structure:
  - `ListLayout` shell with `viewModeKey="employees"`
  - existing `EmployeeFilterPanel` in `filterSlot`
  - `BoardView` with unchanged employee cards and interactions
  - `TableView` with required columns:
    - sortable: `Name`, `Vorname`, `Tour`, `Team`
    - non-sortable: `Telefon`, `Relevanter Termin`, `Geplante Termine`
- Relevant appointment calculation in table rows:
  1. nearest future appointment
  2. else latest historical appointment
  3. else `—`
- Planned appointments counter:
  - number of future appointments per employee.
- Row preview behavior:
  - shows relevant appointment preview on hover
  - shows `Keine Termine geplant` when absent
- Row interaction in table:
  - double click opens employee edit flow
  - single click has no action

### Compliance Confirmation
- Existing layout components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No adapter/wrapper strategy was introduced.
- No routing structure changes (existing `employees` view path retained).
- No backend endpoint changes.
- No backend logic changes.

### Test Points (Phase 5)
- Board mode keeps previous employee card rendering and behavior.
- Table mode renders required columns and sorting.
- Relevant appointment resolution follows required priority rule.
- Planned appointments counter reflects future-appointment count.
- Hover preview shows appointment details or fallback text.
- Double-click opens edit flow.
- View mode switch does not change employee list query key and does not trigger a mode-based data reload.

## Phase 6: Terminliste Einstieg (Table-Only Screen) (2026-02-12)

### Scope
- Added a new screen `Terminliste` as first table-only pattern.
- No migration of existing screens.
- No adapter/wrapper strategy.

### Changed Files
- `shared/routes.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/appointmentsService.ts`
- `server/controllers/appointmentsController.ts`
- `server/routes/appointmentsRoutes.ts`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/Sidebar.tsx`
- `docs/listlayout-tableview-architecture.md`
- `docs/listlayout-tableview-refactor-log.md`

### Implementation Notes
- Introduced new endpoint:
  - `GET /api/appointments/list`
  - query parameters:
    - `employeeId`, `projectId`, `customerId`, `tourId`
    - `dateFrom`, `dateTo`
    - `allDayOnly`, `withStartTimeOnly`, `singleEmployeeOnly`, `lockedOnly`
    - `page` (default `1`), `pageSize` (default `25`)
- Implemented repository + service mapping with consistent existing appointment logic.
- Added dedicated `AppointmentsListPage`:
  - `ListLayout` with `viewModeKey="appointments"`
  - no view toggle
  - `TableView` only
  - sortable columns: `Projekt`, `Kunde`, `Tour`
  - non-sortable columns: `Datum`, `Ganztag`, `Gesperrt`
  - row hover preview via existing weekly appointment preview
  - row double click opens existing appointment edit flow
- Added pagination controls under the table:
  - default `25` entries per page
  - page switch triggers fetch
  - filter change resets page to `1`
- Added new navigation entry in sidebar and integrated screen into `Home`.

### Compliance Confirmation
- Existing layout components were not changed:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- No adapter logic was introduced.
- No existing appointment endpoints were modified semantically.
- No migration of other screens in this phase.

### Test Points (Phase 6)
- `/api/appointments/list` accepts filters and returns paged payload.
- Table renders required columns and sorting behavior.
- Hover preview renders existing appointment preview panel.
- Double-click opens appointment edit form.
- Pagination updates data by page and keeps page size at `25`.
- Filter changes reset page to `1`.
- Internal table state changes do not trigger additional data reload.
