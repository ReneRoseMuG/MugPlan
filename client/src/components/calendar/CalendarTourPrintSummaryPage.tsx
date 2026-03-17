import React from "react";

import { formatTourPrintDateShort2y, type TourPrintPreviewPage } from "@/lib/tour-print-preview";
import { CalendarTourPrintMembersList } from "./CalendarTourPrintMembersList";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { PrintPageHeader } from "@/components/print/PrintPageHeader";

type CalendarTourPrintSummaryPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "summary" }>;
};

export function CalendarTourPrintSummaryPage({ page }: CalendarTourPrintSummaryPageProps) {
  return (
    <PrintPageShell orientation="landscape" testId="tour-print-summary-page">
      <PrintPageHeader
        eyebrow="Tourenplanung"
        headline={page.tourName}
        subline={`Zeitraum: ${formatTourPrintDateShort2y(page.fromDate)} \u2013 ${formatTourPrintDateShort2y(page.toDate)}`}
      />
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <CalendarTourPrintMembersList members={page.members} />
      </div>
    </PrintPageShell>
  );
}
