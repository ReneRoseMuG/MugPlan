import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildTourPrintPages,
  normalizeTourPrintWeekCount,
  type TourPrintPreviewResponse,
} from "@/lib/tour-print-preview";
import { CalendarTourPrintListPage } from "./CalendarTourPrintListPage";

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
  weekendColumnPercent: _weekendColumnPercent,
}: CalendarTourPrintPreviewDialogProps) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const normalizedWeekCount = normalizeTourPrintWeekCount(weekCount);

  const { data, isLoading, isError } = useQuery<TourPrintPreviewResponse>({
    queryKey: ["tourPrintPreview", tourId, fromDate, normalizedWeekCount],
    enabled: open && typeof tourId === "number",
    staleTime: 0,
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
  const printPortalTarget = typeof document !== "undefined" ? document.body : null;

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className="w-[calc(297mm+88px)] max-w-[calc(100vw-32px)] overflow-hidden p-0 print:hidden"
          data-testid="dialog-tour-print-preview"
        >
          <div className="flex max-h-[calc(100vh-32px)] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>Druckvorschau Tour-Zeitleiste</DialogTitle>
            </DialogHeader>

            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 text-sm">
              <div className="font-medium text-slate-700" data-testid="tour-print-preview-page-indicator">
                {pages.length > 0 ? `Seite ${activePageIndex + 1} von ${pages.length}` : "Keine Seiten geladen"}
              </div>
              <div className="min-w-0 truncate text-right text-slate-500" data-testid="tour-print-preview-page-title">
                {activePage?.title ?? ""}
              </div>
            </div>

            <div
              className="relative flex-1 overflow-auto bg-slate-200 px-4 py-4"
              data-testid="tour-print-preview-pages"
            >
              <style>
                {`
                  @media print {
                    @page {
                      size: A4 landscape;
                      margin: 0;
                    }
                    body {
                      margin: 0 !important;
                      background: white !important;
                    }
                    body > * {
                      display: none !important;
                    }
                    body > [data-testid="tour-print-preview-print-root"] {
                      display: block !important;
                    }
                    [data-testid="tour-print-preview-print-root"] {
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    [data-testid="tour-print-preview-print-page"] {
                      display: block !important;
                      break-after: page;
                      page-break-after: always;
                    }
                    [data-testid="tour-print-preview-print-page"]:last-child {
                      break-after: auto;
                      page-break-after: auto;
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
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setActivePageIndex((current) => Math.max(0, current - 1))}
                    disabled={!canGoPrev}
                    aria-label="Vorherige Seite"
                    data-testid="button-tour-print-preview-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex min-h-full items-start justify-center" data-testid="tour-print-preview-active-page-shell">
                    {activePage?.kind === "list" ? (
                      <CalendarTourPrintListPage page={activePage} />
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-300 bg-white/95 p-3 text-slate-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setActivePageIndex((current) => Math.min(pages.length - 1, current + 1))}
                    disabled={!canGoNext}
                    aria-label="Naechste Seite"
                    data-testid="button-tour-print-preview-next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {printPortalTarget && pages.length > 0 ? createPortal(
        <div className="hidden" data-testid="tour-print-preview-print-root">
          {pages.map((page) => (
            page.kind === "list" ? (
              <div key={`print-page-${page.pageNumber}`} data-testid="tour-print-preview-print-page">
                <CalendarTourPrintListPage page={page} />
              </div>
            ) : null
          ))}
        </div>,
        printPortalTarget,
      ) : null}
    </>
  );
}
