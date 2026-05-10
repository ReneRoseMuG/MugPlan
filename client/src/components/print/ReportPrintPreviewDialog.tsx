import React, { type Key, type ReactNode } from "react";
import { Printer } from "lucide-react";

import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { Button } from "@/components/ui/button";

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
  onPrint: () => void;
  printDisabled?: boolean;
  printTestId: string;
  extraActions?: ReactNode;
};

export function ReportPrintPreviewDialog<TPage>({
  onPrint,
  printDisabled = false,
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
