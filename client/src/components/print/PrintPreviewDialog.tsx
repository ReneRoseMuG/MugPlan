import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrintDocumentRoot } from "./PrintDocumentRoot";

type PrintPreviewDialogProps<TPage> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  headerActions?: React.ReactNode;
  pages: readonly TPage[];
  activePageIndex: number;
  onPageChange: (nextPageIndex: number) => void;
  renderPage: (page: TPage, index: number) => React.ReactNode;
  getPageTitle?: (page: TPage, index: number) => string;
  getPageKey?: (page: TPage, index: number) => React.Key;
  dialogWidthClassName?: string;
  testIdPrefix?: string;
  dialogTestId?: string;
  loadingState?: React.ReactNode;
  errorState?: React.ReactNode;
  showPageMetaBar?: boolean;
};

export function PrintPreviewDialog<TPage>({
  open,
  onOpenChange,
  title,
  headerActions,
  pages,
  activePageIndex,
  onPageChange,
  renderPage,
  getPageTitle,
  getPageKey,
  dialogWidthClassName,
  testIdPrefix = "print-preview",
  dialogTestId,
  loadingState,
  errorState,
  showPageMetaBar = true,
}: PrintPreviewDialogProps<TPage>) {
  const activePage = pages[activePageIndex] ?? null;
  const canGoPrev = activePageIndex > 0;
  const canGoNext = activePageIndex < pages.length - 1;

  React.useEffect(() => {
    if (!open || pages.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        onPageChange(Math.max(0, activePageIndex - 1));
      }
      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        onPageChange(Math.min(pages.length - 1, activePageIndex + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePageIndex, canGoNext, canGoPrev, onPageChange, open, pages.length]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`w-[calc(297mm+88px)] max-w-[calc(100vw-32px)] overflow-hidden p-0 print:hidden${dialogWidthClassName ? ` ${dialogWidthClassName}` : ""}`}
          data-testid={dialogTestId ?? `${testIdPrefix}-dialog`}
        >
          <div className="flex max-h-[calc(100vh-32px)] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>{title}</DialogTitle>
                {headerActions ? <div className="pr-8">{headerActions}</div> : null}
              </div>
            </DialogHeader>

            {showPageMetaBar ? (
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 text-sm">
                <div className="font-medium text-slate-700" data-testid={`${testIdPrefix}-page-indicator`}>
                  {pages.length > 0 ? `Seite ${activePageIndex + 1} von ${pages.length}` : "Keine Seiten geladen"}
                </div>
                <div className="min-w-0 truncate text-right text-slate-500" data-testid={`${testIdPrefix}-page-title`}>
                  {activePage && getPageTitle ? getPageTitle(activePage, activePageIndex) : ""}
                </div>
              </div>
            ) : null}

            <div className="relative flex-1 overflow-auto bg-slate-200 px-4 py-4" data-testid={`${testIdPrefix}-pages`}>
              <style>
                {`
                  @media print {
                    @page {
                      margin: 0;
                    }
                    body {
                      margin: 0 !important;
                      background: white !important;
                    }
                    body > * {
                      display: none !important;
                    }
                    body > [data-testid="print-document-root"] {
                      display: block !important;
                    }
                    [data-testid="print-document-root"] {
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    [data-testid="print-document-page"] {
                      display: block !important;
                      break-after: page;
                      page-break-after: always;
                    }
                    [data-testid="print-document-page"]:last-child {
                      break-after: auto;
                      page-break-after: auto;
                    }
                  }
                `}
              </style>

              {loadingState}
              {errorState}

              {pages.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => onPageChange(Math.max(0, activePageIndex - 1))}
                    disabled={!canGoPrev}
                    aria-label="Vorherige Seite"
                    data-testid={`button-${testIdPrefix}-prev`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex min-h-full items-start justify-center" data-testid={`${testIdPrefix}-active-page-shell`}>
                    {activePage ? renderPage(activePage, activePageIndex) : null}
                  </div>

                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => onPageChange(Math.min(pages.length - 1, activePageIndex + 1))}
                    disabled={!canGoNext}
                    aria-label="Naechste Seite"
                    data-testid={`button-${testIdPrefix}-next`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintDocumentRoot pages={pages} renderPage={renderPage} getPageKey={getPageKey} />
    </>
  );
}
