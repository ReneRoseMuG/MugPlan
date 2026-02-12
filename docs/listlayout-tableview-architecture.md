# ListLayout + BoardView + TableView Architecture (Phase 1)

## Scope
This document describes the new infrastructure components introduced in Phase 1 only.
No screen migration is part of this phase.

## Components

### `ListLayout`
Shell component for list-like screens with explicit slots.

```tsx
export interface ListLayoutProps {
  title: string;
  icon: ReactNode;
  viewModeKey?: string;
  contentSlot: ReactNode;
  filterSlot?: ReactNode;
  viewModeToggle?: ReactNode;
  headerActions?: ReactNode;
  footerSlot?: ReactNode;
  helpKey?: string;
  isLoading?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  closeTestId?: string;
  className?: string;
  contentClassName?: string;
}
```

Contract:
- Renders a shell with `Header`, optional `FilterSlot`, `ContentSlot`, optional `FooterSlot`.
- `viewModeToggle` is rendered in the header action area (right side).
- `contentSlot` is required and owns board/table/calendar content.
- Loading mode renders spinner state and bypasses slot content.

### `BoardView`
Grid renderer extracted as dedicated component, visually aligned to existing card grid style.

```tsx
export interface BoardViewProps {
  children: ReactNode;
  gridCols?: "2" | "3";
  toolbar?: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  gridTestId?: string;
  className?: string;
  containerClassName?: string;
}
```

Contract:
- Uses existing `cardListColumns` setting to resolve responsive grid classes.
- Supports fixed 2-column mode (`gridCols="2"`) for special cases.
- Supports optional toolbar area above the grid.
- Supports empty-state replacement (`isEmpty + emptyState`).
- Keeps visual spacing/classes equivalent to current card-grid rendering.

### `TableView<T>`
Generic typed table component with optional hover preview and row double click.

```tsx
export type TableViewColumnAlign = "left" | "center" | "right";

export interface TableViewColumnDef<T> {
  id: string;
  header: ReactNode;
  accessor?: (row: T) => unknown;
  cell?: (context: { row: T; value: unknown; rowIndex: number }) => ReactNode;
  width?: number | string;
  minWidth?: number | string;
  align?: TableViewColumnAlign;
  className?: string;
  headerClassName?: string;
}

export interface TableViewProps<T> {
  columns: TableViewColumnDef<T>[];
  rows: T[];
  rowKey: (row: T, rowIndex: number) => string | number;
  onRowDoubleClick?: (row: T, rowIndex: number) => void;
  rowPreviewRenderer?: (row: T, rowIndex: number) => ReactNode;
  emptyState?: ReactNode;
  density?: "compact" | "comfortable";
  stickyHeader?: boolean;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  testId?: string;
}
```

Contract:
- Generic rows/columns API with strict typing (`T`).
- No `onRowClick` API by design.
- Row interaction uses `onRowDoubleClick` only.
- Optional `rowPreviewRenderer` enables hover preview via existing `HoverPreview` component.
- Empty-state row is rendered when `rows` is empty.

## Usage Examples

### Example: List shell with BoardView

```tsx
<ListLayout
  title="Customers"
  icon={<Users className="w-5 h-5" />}
  filterSlot={<CustomerFilters />}
  viewModeToggle={<ViewModeToggle value="board" onChange={setMode} />}
  contentSlot={
    <BoardView isEmpty={customers.length === 0} emptyState={<EmptyState />}>
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </BoardView>
  }
/>
```

### Example: List shell with TableView

```tsx
type CustomerRow = { id: number; name: string; city: string };

const columns: TableViewColumnDef<CustomerRow>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name },
  { id: "city", header: "City", accessor: (row) => row.city },
];

<ListLayout
  title="Customers"
  icon={<Users className="w-5 h-5" />}
  viewModeToggle={<ViewModeToggle value="table" onChange={setMode} />}
  contentSlot={
    <TableView
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowDoubleClick={(row) => openDetails(row.id)}
      rowPreviewRenderer={(row) => <CustomerPreview customerId={row.id} />}
      stickyHeader
    />
  }
/>
```

## Customization Points
- `ListLayout`: `filterSlot`, `viewModeToggle`, `headerActions`, `footerSlot`, `contentClassName`.
- `BoardView`: `gridCols`, `toolbar`, `containerClassName`, `className`, empty-state handling.
- `TableView`: `columns` with per-column sizing/alignment/renderers, `density`, `stickyHeader`, `rowClassName`, optional preview.

## Expected Contracts Summary
- `ListLayout` is structure-only shell composition.
- `BoardView` is board/grid rendering only.
- `TableView` is generic table rendering with typed columns and rows.
- No component contains domain-specific API calls or screen-specific business logic.

## HelpTexts Migration (Phase 2)
Final integration state for `HelpTextsPage`:

```tsx
<ListLayout
  title="Hilfetexte"
  icon={<HelpCircle className="w-5 h-5" />}
  viewModeKey="helptexts"
  filterSlot={<HelpTextsFilterPanel />}
  viewModeToggle={<HelpTextsViewModeToggle />}
  contentSlot={
    viewMode === "board" ? (
      <BoardView gridCols="2">{/* existing help text cards */}</BoardView>
    ) : (
      <TableView
        columns={helpTextColumns}
        rows={sortedHelpTexts}
        rowKey={(row) => row.id}
        onRowDoubleClick={(row) => handleOpenEdit(row)}
        rowPreviewRenderer={(row) => <HelpTextPreview row={row} />}
      />
    )
  }
/>
```

Phase-2 contract for `HelpTextsPage`:
- View mode persistence uses existing settings infrastructure with key `helptexts.viewMode`.
- Default view mode is `board` if no persisted user value exists.
- Board mode keeps card rendering parity (grid, spacing, interactions).
- Table mode exposes sortable columns:
  - `Key`
  - `Inhalt vorhanden (Ja/Nein)`
- Table interactions:
  - hover: preview content (or missing-content message)
  - double click: open edit dialog
  - single click: no action

## Projects Migration (Phase 3)
Final integration state for `ProjectsPage`:

```tsx
<ListLayout
  title="Projekte"
  icon={<FolderKanban className="w-5 h-5" />}
  viewModeKey="projects"
  filterSlot={<ProjectFilterPanel ... />}
  viewModeToggle={<ProjectsViewModeToggle />}
  contentSlot={
    viewMode === "board" ? (
      <BoardView gridCols="3">{/* existing project cards */}</BoardView>
    ) : (
      <TableView
        columns={projectColumns}
        rows={sortedProjectRows}
        rowKey={(row) => row.project.id}
        onRowDoubleClick={(row) => onSelectProject?.(row.project.id)}
        rowPreviewRenderer={(row) => <RelevantAppointmentPreview row={row} />}
      />
    )
  }
/>
```

Phase-3 contract for `ProjectsPage`:
- View mode persistence uses key `projects.viewMode` in existing settings infrastructure.
- Default view mode is `board` if no persisted user value exists.
- Board mode keeps existing project card rendering and interactions unchanged.
- Table mode columns:
  - `Titel` (sortable)
  - `Kunde` (sortable)
  - `Relevanter Termin` (sortable)
- Relevant appointment resolution:
  1. nearest future appointment (if available)
  2. otherwise most recent historical appointment
  3. otherwise `—`
- Table interactions:
  - hover: appointment preview (or `Keine Termine vorhanden.`)
  - double click: open project edit flow
  - single click: no action
