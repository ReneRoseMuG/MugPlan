import React, { type ReactNode } from "react";
import { HoverPreview } from "@/components/ui/hover-preview";
import type { InfoBadgePreview, InfoBadgePreviewOptions } from "@/components/ui/info-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
  rowPreviewRenderer?: (row: T, rowIndex: number) => ReactNode | InfoBadgePreview;
  emptyState?: ReactNode;
  density?: "compact" | "comfortable";
  stickyHeader?: boolean;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  testId?: string;
}

function toCssSize(value: number | string | undefined) {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function alignmentClass(align: TableViewColumnAlign | undefined) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

const defaultPreviewOptions: InfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right",
  align: "start",
  maxWidth: 360,
  maxHeight: 260,
  scrollY: "auto",
};

function isInfoBadgePreview(preview: ReactNode | InfoBadgePreview): preview is InfoBadgePreview {
  return typeof preview === "object" && preview !== null && "content" in preview;
}

export function TableView<T>({
  columns,
  rows,
  rowKey,
  onRowDoubleClick,
  rowPreviewRenderer,
  emptyState,
  density = "comfortable",
  stickyHeader = false,
  className,
  tableClassName,
  rowClassName,
  testId,
}: TableViewProps<T>) {
  const rowPaddingClass = density === "compact" ? "py-2" : "py-4";

  return (
    <div className={cn("h-full overflow-auto p-6", className)} data-testid={testId}>
      <Table className={cn("min-w-full", tableClassName)}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  alignmentClass(column.align),
                  stickyHeader && "sticky top-0 z-10 bg-card border-b",
                  column.headerClassName,
                )}
                style={{
                  width: toCssSize(column.width),
                  minWidth: toCssSize(column.minWidth),
                }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                {emptyState ?? "Keine Eintraege vorhanden."}
              </TableCell>
            </TableRow>
          )}

          {rows.map((row, rowIndex) => {
            const resolvedRowKey = rowKey(row, rowIndex);
            const cells = columns.map((column) => {
              const value = column.accessor ? column.accessor(row) : undefined;
              const content = column.cell
                ? column.cell({ row, value, rowIndex })
                : value === null || value === undefined
                  ? ""
                  : String(value);

              return (
                <TableCell
                  key={column.id}
                  className={cn(rowPaddingClass, alignmentClass(column.align), column.className)}
                  style={{
                    width: toCssSize(column.width),
                    minWidth: toCssSize(column.minWidth),
                  }}
                >
                  {content}
                </TableCell>
              );
            });

            if (!rowPreviewRenderer) {
              return (
                <TableRow
                  key={resolvedRowKey}
                  className={cn(onRowDoubleClick && "cursor-pointer", rowClassName?.(row, rowIndex))}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, rowIndex) : undefined}
                >
                  {cells}
                </TableRow>
              );
            }

            const resolvedPreview = rowPreviewRenderer(row, rowIndex);
            if (isInfoBadgePreview(resolvedPreview)) {
              const previewOptions = {
                ...defaultPreviewOptions,
                ...resolvedPreview.options,
              };

              return (
                <HoverPreview
                  key={resolvedRowKey}
                  preview={resolvedPreview.content}
                  mode="cursor"
                  openDelay={previewOptions.openDelayMs}
                  side={previewOptions.side}
                  align={previewOptions.align}
                  maxWidth={previewOptions.maxWidth}
                  maxHeight={previewOptions.maxHeight}
                  className={previewOptions.scrollY === "auto" ? "overflow-y-auto" : undefined}
                >
                  <TableRow
                    className={cn(onRowDoubleClick && "cursor-pointer", rowClassName?.(row, rowIndex))}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, rowIndex) : undefined}
                  >
                    {cells}
                  </TableRow>
                </HoverPreview>
              );
            }

            return (
              <HoverPreview key={resolvedRowKey} preview={resolvedPreview} mode="cursor">
                <TableRow
                  className={cn(onRowDoubleClick && "cursor-pointer", rowClassName?.(row, rowIndex))}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, rowIndex) : undefined}
                >
                  {cells}
                </TableRow>
              </HoverPreview>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
