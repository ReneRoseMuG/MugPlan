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
