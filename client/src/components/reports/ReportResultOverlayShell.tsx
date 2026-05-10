import React, { type ReactNode } from "react";
import { Printer, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportResultOverlayShellProps = {
  open: boolean;
  title: string;
  metaLabel?: string;
  onRefresh: () => void;
  onOpenPrintPreview: () => void;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  testId: string;
  refreshTestId: string;
  printPreviewTestId: string;
  backTestId: string;
  isRefreshing?: boolean;
  printPreviewDisabled?: boolean;
};

export function ReportResultOverlayShell({
  open,
  title,
  metaLabel,
  onRefresh,
  onOpenPrintPreview,
  onBack,
  children,
  footer,
  className,
  contentClassName,
  testId,
  refreshTestId,
  printPreviewTestId,
  backTestId,
  isRefreshing = false,
  printPreviewDisabled = false,
}: ReportResultOverlayShellProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 bg-card transition-opacity",
        open ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0",
        className,
      )}
      aria-hidden={!open}
      data-testid={testId}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 print:hidden">
          <div className="flex min-w-0 items-baseline gap-3">
            <h3 className="shrink-0 text-base font-semibold text-foreground">{title}</h3>
            {metaLabel ? <span className="truncate text-sm text-muted-foreground">{metaLabel}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onRefresh} disabled={isRefreshing} data-testid={refreshTestId}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing ? "animate-spin" : undefined)} />
              Aktualisieren
            </Button>
            <Button type="button" variant="outline" onClick={onOpenPrintPreview} disabled={printPreviewDisabled} data-testid={printPreviewTestId}>
              <Printer className="h-4 w-4" />
              Druckvorschau
            </Button>
            <Button type="button" variant="outline" onClick={onBack} data-testid={backTestId}>Zurück</Button>
          </div>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-hidden", contentClassName)}>
          {children}
        </div>
        {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
