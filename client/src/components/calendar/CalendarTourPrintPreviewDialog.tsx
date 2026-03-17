import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildTourPrintPages,
  normalizeTourPrintWeekCount,
  type TourPrintPreviewResponse,
} from "@/lib/tour-print-preview";
import { CalendarTourPrintSummaryPage } from "./CalendarTourPrintSummaryPage";
import { CalendarTourPrintWeekPage } from "./CalendarTourPrintWeekPage";

type CalendarTourPrintPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: number | null;
  weekCount: number;
  fromDate: string;
  weekendColumnPercent: number;
};

export function CalendarTourPrintPreviewDialog({
  open,
  onOpenChange,
  tourId,
  weekCount,
  fromDate,
  weekendColumnPercent,
}: CalendarTourPrintPreviewDialogProps) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const normalizedWeekCount = normalizeTourPrintWeekCount(weekCount);

  const { data, isLoading, isError } = useQuery<TourPrintPreviewResponse>({
    queryKey: ["tourPrintPreview", tourId, fromDate, normalizedWeekCount],
    enabled: open && typeof tourId === "number",
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate,
        weekCount: String(normalizedWeekCount),
      });
      const response = await fetch(`/api/tours/${tourId}/print-preview?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Druckvorschau konnte nicht geladen werden");
      }
      return (await response.json()) as TourPrintPreviewResponse;
    },
  });

  const pages = useMemo(() => (data ? buildTourPrintPages(data) : []), [data]);
  const activePage = pages[activePageIndex] ?? null;
  const canGoPrev = activePageIndex > 0;
  const canGoNext = activePageIndex < pages.length - 1;

  useEffect(() => {
    if (!open) {
      setActivePageIndex(0);
      return;
    }
    setActivePageIndex(0);
  }, [data, open, tourId, normalizedWeekCount]);

  useEffect(() => {
    if (!open || pages.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        setActivePageIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        setActivePageIndex((current) => Math.min(pages.length - 1, current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrev, open, pages.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[94vh] w-[98vw] max-w-[1500px] overflow-hidden p-0 print:left-0 print:top-0 print:h-auto print:w-auto print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-0 print:bg-white print:shadow-none"
        data-testid="dialog-tour-print-preview"
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border px-6 py-4 print:hidden">
            <DialogTitle>Druckvorschau Tour-Zeitleiste</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 text-sm print:hidden">
            <div className="font-medium text-slate-700" data-testid="tour-print-preview-page-indicator">
              {pages.length > 0 ? `Seite ${activePageIndex + 1} von ${pages.length}` : "Keine Seiten geladen"}
            </div>
            <div className="min-w-0 truncate text-right text-slate-500" data-testid="tour-print-preview-page-title">
              {activePage?.title ?? ""}
            </div>
          </div>

          <div
            className="relative flex-1 overflow-auto bg-slate-200 px-6 py-6 print:bg-white print:px-0 print:py-0"
            data-testid="tour-print-preview-pages"
          >
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  [data-testid="dialog-tour-print-preview"] {
                    position: static !important;
                    inset: auto !important;
                    display: block !important;
                  }
                  [data-testid="tour-print-preview-pages"], [data-testid="tour-print-preview-pages"] * {
                    visibility: visible;
                  }
                  [data-testid="tour-print-preview-pages"] {
                    position: static;
                    width: 100%;
                    min-height: auto;
                    overflow: visible;
                    background: white;
                  }
                  [data-testid="tour-print-preview-active-page-shell"] {
                    display: none !important;
                  }
                  [data-testid="tour-print-preview-print-stack"] {
                    display: flex !important;
                    flex-direction: column;
                    gap: 0 !important;
                  }
                  .tour-print-page {
                    box-shadow: none !important;
                    margin: 0 !important;
                    border: none !important;
                    break-after: page;
                    page-break-after: always;
                  }
                  .tour-print-page:last-child {
                    break-after: auto;
                    page-break-after: auto;
                  }
                  .tour-print-page--portrait {
                    width: 210mm !important;
                    min-height: 297mm !important;
                  }
                  .tour-print-page--landscape {
                    width: 297mm !important;
                    min-height: 210mm !important;
                  }
                }
              `}
            </style>

            {isLoading ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
            {isError ? <div className="text-sm text-destructive">Druckvorschau konnte nicht geladen werden.</div> : null}

            {pages.length > 0 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
                  onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
                  disabled={!canGoPrev}
                  aria-label="Vorherige Seite"
                  data-testid="button-tour-print-preview-prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex min-h-full items-start justify-center" data-testid="tour-print-preview-active-page-shell">
                  {activePage?.kind === "summary" ? (
                    <CalendarTourPrintSummaryPage page={activePage} />
                  ) : activePage?.kind === "week" ? (
                    <CalendarTourPrintWeekPage page={activePage} weekendColumnPercent={weekendColumnPercent} />
                  ) : null}
                </div>

                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
                  onClick={() => setActivePageIndex((current) => Math.min(pages.length - 1, current + 1))}
                  disabled={!canGoNext}
                  aria-label="Naechste Seite"
                  data-testid="button-tour-print-preview-next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="hidden print:flex print:flex-col" data-testid="tour-print-preview-print-stack">
                  {pages.map((page) =>
                    page.kind === "summary" ? (
                      <CalendarTourPrintSummaryPage key={`print-page-${page.pageNumber}`} page={page} />
                    ) : (
                      <CalendarTourPrintWeekPage
                        key={`print-page-${page.pageNumber}`}
                        page={page}
                        weekendColumnPercent={weekendColumnPercent}
                      />
                    ),
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
