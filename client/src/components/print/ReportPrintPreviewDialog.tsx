import React, { type Key, type ReactNode } from "react";
import { Printer, RefreshCw } from "lucide-react";

import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportPrintPreviewDialogProps<TPage> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pages: readonly TPage[];
  activePageIndex: number;
  onPageChange: (nextPageIndex: number) => void;
  renderPage: (page: TPage, index: number) => ReactNode;
  getPageTitle?: (page: TPage, index: number) => string;
  getPageKey?: (page: TPage, index: number) => Key;
  dialogWidthClassName?: string;
  testIdPrefix?: string;
  dialogTestId?: string;
  loadingState?: ReactNode;
  errorState?: ReactNode;
  showPageMetaBar?: boolean;
  pageOrientation?: "portrait" | "landscape";
  onPageOrientationChange?: (nextOrientation: "portrait" | "landscape") => void;
  orientationTestIdPrefix?: string;
  onRefresh: () => void;
  onPrint: () => void;
  isRefreshing?: boolean;
  printDisabled?: boolean;
  refreshTestId: string;
  printTestId: string;
  extraActions?: ReactNode;
};

export function ReportPrintPreviewDialog<TPage>({
  onRefresh,
  onPrint,
  isRefreshing = false,
  printDisabled = false,
  refreshTestId,
  printTestId,
  extraActions,
  pageOrientation,
  onPageOrientationChange,
  orientationTestIdPrefix,
  ...previewProps
}: ReportPrintPreviewDialogProps<TPage>) {
  const orientationActions = pageOrientation && onPageOrientationChange ? (
    <>
      <Button
        type="button"
        variant={pageOrientation === "landscape" ? "default" : "outline"}
        size="sm"
        onClick={() => onPageOrientationChange("landscape")}
        data-testid={orientationTestIdPrefix ? `${orientationTestIdPrefix}-landscape` : undefined}
      >
        Querformat
      </Button>
      <Button
        type="button"
        variant={pageOrientation === "portrait" ? "default" : "outline"}
        size="sm"
        onClick={() => onPageOrientationChange("portrait")}
        data-testid={orientationTestIdPrefix ? `${orientationTestIdPrefix}-portrait` : undefined}
      >
        Hochformat
      </Button>
    </>
  ) : null;

  return (
    <PrintPreviewDialog
      {...previewProps}
      pageOrientation={pageOrientation}
      headerActions={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} data-testid={refreshTestId}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing ? "animate-spin" : undefined)} />
            Aktualisieren
          </Button>
          {orientationActions}
          {extraActions}
          <Button type="button" variant="outline" size="sm" onClick={onPrint} disabled={printDisabled} data-testid={printTestId}>
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
        </div>
      )}
    />
  );
}
