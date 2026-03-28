import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
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

  useEffect(() => {
    if (!open) {
      setActivePageIndex(0);
      return;
    }
    setActivePageIndex(0);
  }, [data, open, tourId, normalizedWeekCount]);

  return (
    <PrintPreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Druckvorschau Tour-Zeitleiste"
      pages={pages}
      activePageIndex={activePageIndex}
      onPageChange={setActivePageIndex}
      testIdPrefix="tour-print-preview"
      dialogTestId="dialog-tour-print-preview"
      getPageKey={(page) => page.pageNumber}
      getPageTitle={(page) => page.title}
      renderPage={(page) => (
        page.kind === "list" ? <CalendarTourPrintListPage page={page} /> : null
      )}
      dialogWidthClassName="w-[calc(297mm+88px)]"
      loadingState={isLoading ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
      errorState={isError ? <div className="text-sm text-destructive">Druckvorschau konnte nicht geladen werden.</div> : null}
    />
  );
}
