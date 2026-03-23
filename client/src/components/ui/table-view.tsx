import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { HoverPreview } from "@/components/ui/hover-preview";
import type { InfoBadgePreview, InfoBadgePreviewOptions } from "@/components/ui/info-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  footerSlot?: ReactNode;
  stickyFooter?: boolean;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  rowStyle?: (row: T, rowIndex: number) => React.CSSProperties | undefined;
  rowTitle?: (row: T, rowIndex: number) => string | undefined;
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

function wrapRowWithTooltip(rowNode: ReactNode, tooltipContent: string | undefined) {
  if (!tooltipContent) {
    return rowNode;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{rowNode}</TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
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
  testId,
}: TableViewProps<T>) {
  const rowPaddingClass = density === "compact" ? "py-1.5" : "py-2.5";
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const footerScrollRef = useRef<HTMLDivElement | null>(null);
  const syncSourceRef = useRef<"body" | "footer" | null>(null);
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
        >
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    alignmentClass(column.align),
                    stickyHeader && "sticky top-0 z-10 bg-muted/95 border-b shadow-[0_1px_0_0_hsl(var(--border))]",
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <div className="flex min-h-[18rem] items-center justify-center px-4 py-10 text-center text-muted-foreground">
                    {emptyState ?? "Keine Eintraege vorhanden."}
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
                    {wrapRowWithTooltip(rowNode, resolvedRowTooltip)}
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
                    {wrapRowWithTooltip(rowNode, resolvedRowTooltip)}
                  </HoverPreview>
                );
              }

              return (
                <HoverPreview key={resolvedRowKey} preview={resolvedPreview} mode="cursor">
                  {wrapRowWithTooltip(rowNode, resolvedRowTooltip)}
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
            <div className={cn("px-6 pb-3", footerSlot ? "border-t border-border/70 pt-2" : "pt-3")}>
              <div
                ref={footerScrollRef}
                className="visible-horizontal-scrollbar overflow-x-scroll overflow-y-hidden rounded-full bg-muted/35"
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
