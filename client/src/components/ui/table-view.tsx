import React, { useEffect, useRef, useState, type ReactNode } from "react";
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
  truncate?: boolean;
  resizable?: boolean;
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
  footerSlot?: ReactNode;
  stickyFooter?: boolean;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  rowStyle?: (row: T, rowIndex: number) => React.CSSProperties | undefined;
  rowTitle?: (row: T, rowIndex: number) => string | undefined;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnResizeEnd?: (columnId: string, width: number) => void;
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

function wrapRowWithCursorPreview(rowNode: ReactNode, tooltipContent: string | undefined) {
  if (!tooltipContent) return rowNode;

  return (
    <HoverPreview
      preview={<div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md">{tooltipContent}</div>}
      mode="cursor"
      openDelay={80}
      closeDelay={40}
      cursorOffsetX={12}
      cursorOffsetY={14}
      maxWidth={220}
      maxHeight={null}
    >
      {rowNode}
    </HoverPreview>
  );
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
  footerSlot,
  stickyFooter = true,
  className,
  tableClassName,
  rowClassName,
  rowStyle,
  rowTitle,
  onColumnResize,
  onColumnResizeEnd,
  testId,
}: TableViewProps<T>) {
  const rowPaddingClass = density === "compact" ? "py-1.5" : "py-2.5";
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const footerScrollRef = useRef<HTMLDivElement | null>(null);
  const syncSourceRef = useRef<"body" | "footer" | null>(null);
  const activeColumnResizeRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
    minWidth: number;
  } | null>(null);
  const [horizontalMetrics, setHorizontalMetrics] = useState({
    hasOverflow: false,
    scrollWidth: 0,
  });

  useEffect(() => {
    const updateMetrics = () => {
      const viewport = bodyScrollRef.current;
      if (!viewport) return;

      const nextScrollWidth = viewport.scrollWidth;
      const hasOverflow = nextScrollWidth > viewport.clientWidth + 1;

      setHorizontalMetrics((current) => {
        if (current.hasOverflow === hasOverflow && current.scrollWidth === nextScrollWidth) {
          return current;
        }
        return {
          hasOverflow,
          scrollWidth: nextScrollWidth,
        };
      });

      if (footerScrollRef.current && footerScrollRef.current.scrollLeft !== viewport.scrollLeft) {
        footerScrollRef.current.scrollLeft = viewport.scrollLeft;
      }
    };

    const viewport = bodyScrollRef.current;
    const tableContainer = tableContainerRef.current;

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });

    if (viewport) {
      resizeObserver.observe(viewport);
    }
    if (tableContainer) {
      resizeObserver.observe(tableContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [columns, rows, footerSlot]);

  const handleBodyScroll = () => {
    const viewport = bodyScrollRef.current;
    const footerScroll = footerScrollRef.current;
    if (!viewport || !footerScroll) return;

    if (syncSourceRef.current === "footer") {
      syncSourceRef.current = null;
      return;
    }

    syncSourceRef.current = "body";
    footerScroll.scrollLeft = viewport.scrollLeft;
  };

  const handleFooterScroll = () => {
    const viewport = bodyScrollRef.current;
    const footerScroll = footerScrollRef.current;
    if (!viewport || !footerScroll) return;

    if (syncSourceRef.current === "body") {
      syncSourceRef.current = null;
      return;
    }

    syncSourceRef.current = "footer";
    viewport.scrollLeft = footerScroll.scrollLeft;
  };

  const showFooterBar = stickyFooter && (Boolean(footerSlot) || horizontalMetrics.hasOverflow);
  const footerScrollTestId = testId ? `${testId}-footer-scrollbar` : undefined;
  const totalColumnWidth = columns.reduce((sum, column) => {
    const resolvedWidth = typeof column.width === "number"
      ? column.width
      : typeof column.minWidth === "number"
        ? column.minWidth
        : 0;
    return sum + resolvedWidth;
  }, 0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const activeResize = activeColumnResizeRef.current;
      if (!activeResize) return;

      const nextWidth = Math.max(
        activeResize.minWidth,
        Math.round(activeResize.startWidth + (event.clientX - activeResize.startX)),
      );

      onColumnResize?.(activeResize.columnId, nextWidth);
    };

    const handleMouseUp = (event: MouseEvent) => {
      const activeResize = activeColumnResizeRef.current;
      if (!activeResize) return;

      const nextWidth = Math.max(
        activeResize.minWidth,
        Math.round(activeResize.startWidth + (event.clientX - activeResize.startX)),
      );

      activeColumnResizeRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      onColumnResizeEnd?.(activeResize.columnId, nextWidth);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
  }, [onColumnResize, onColumnResizeEnd]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-testid={testId}>
      <div
        ref={bodyScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4"
        onScroll={handleBodyScroll}
      >
        <Table
          className={cn("min-w-full", tableClassName)}
          containerClassName="overflow-visible"
          containerRef={tableContainerRef}
          style={totalColumnWidth > 0 ? { minWidth: `${totalColumnWidth}px` } : undefined}
        >
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    alignmentClass(column.align),
                    "border-r border-border/70 last:border-r-0",
                    stickyHeader && "sticky top-0 z-10 bg-muted/95 border-b shadow-[0_1px_0_0_hsl(var(--border))]",
                    column.truncate && "whitespace-nowrap",
                    column.headerClassName,
                  )}
                  style={{
                    width: toCssSize(column.width),
                    minWidth: toCssSize(column.minWidth),
                  }}
                >
                  <div className={cn("relative flex items-center gap-2", column.resizable && "pr-5")}>
                    <span className="block">{column.header}</span>
                    {column.resizable ? (
                      <button
                        type="button"
                        aria-label={`Spalte ${typeof column.header === "string" ? column.header : column.id} in der Breite anpassen`}
                        className="absolute inset-y-[-4px] right-[-8px] z-20 w-5 cursor-col-resize select-none touch-none rounded-full hover:bg-slate-400/15"
                        data-testid={testId ? `${testId}-resize-${column.id}` : undefined}
                        onMouseDown={(event) => {
                          const startWidth = typeof column.width === "number"
                            ? column.width
                            : (event.currentTarget.parentElement?.parentElement?.getBoundingClientRect().width ?? 0);
                          const minWidth = typeof column.minWidth === "number"
                            ? column.minWidth
                            : Math.max(80, Math.round(startWidth));

                          activeColumnResizeRef.current = {
                            columnId: column.id,
                            startX: event.clientX,
                            startWidth: Math.max(minWidth, Math.round(startWidth)),
                            minWidth,
                          };
                          document.body.style.setProperty("cursor", "col-resize");
                          document.body.style.setProperty("user-select", "none");
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-slate-600 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                        />
                      </button>
                    ) : null}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <div className="flex min-h-[18rem] items-center justify-center px-4 py-10 text-center text-muted-foreground">
                    {emptyState ?? "Keine Einträge vorhanden."}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, rowIndex) => {
              const resolvedRowKey = rowKey(row, rowIndex);
              const resolvedRowTooltip = rowTitle?.(row, rowIndex);
              const cells = columns.map((column) => {
                const value = column.accessor ? column.accessor(row) : undefined;
                const content = column.cell
                  ? column.cell({ row, value, rowIndex })
                  : value === null || value === undefined
                    ? ""
                    : String(value);

                const cellContent = column.truncate
                  ? (
                    <span
                      className="block max-w-0 min-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                      title={typeof value === "string" ? value : (value == null ? "" : String(value))}
                    >
                      {content}
                    </span>
                  )
                  : content;

                return (
                  <TableCell
                    key={column.id}
                    className={cn(rowPaddingClass, alignmentClass(column.align), column.className)}
                    style={{
                      width: toCssSize(column.width),
                      minWidth: toCssSize(column.minWidth),
                    }}
                  >
                    {cellContent}
                  </TableCell>
                );
              });

              const rowNode = (
                <TableRow
                  className={cn(onRowDoubleClick && "cursor-pointer", rowClassName?.(row, rowIndex))}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, rowIndex) : undefined}
                  style={rowStyle?.(row, rowIndex)}
                  aria-label={resolvedRowTooltip}
                >
                  {cells}
                </TableRow>
              );

              if (!rowPreviewRenderer) {
                return (
                  <React.Fragment key={resolvedRowKey}>
                    {wrapRowWithCursorPreview(rowNode, resolvedRowTooltip)}
                  </React.Fragment>
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
                    {rowNode}
                  </HoverPreview>
                );
              }

              return (
                <HoverPreview key={resolvedRowKey} preview={resolvedPreview} mode="cursor">
                  {rowNode}
                </HoverPreview>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showFooterBar ? (
        <div className="flex shrink-0 flex-col border-t border-border bg-card">
          {footerSlot ? (
            <div className="px-6 py-4">
              {footerSlot}
            </div>
          ) : null}

          {horizontalMetrics.hasOverflow ? (
            <div className={cn("relative z-20 px-6 pb-4", footerSlot ? "border-t border-border/70 pt-3" : "pt-4")}>
              <div
                ref={footerScrollRef}
                className="visible-horizontal-scrollbar relative z-20 h-6 overflow-x-scroll overflow-y-hidden rounded-full border border-border/70 bg-[hsl(var(--color-beige)/0.82)] shadow-sm"
                data-testid={footerScrollTestId}
                onScroll={handleFooterScroll}
              >
                <div style={{ width: horizontalMetrics.scrollWidth, height: 1 }} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
