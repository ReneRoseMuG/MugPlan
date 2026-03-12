import React from "react";

import type { TourPrintPreviewPage } from "@/lib/tour-print-preview";
import { CalendarTourPrintMembersList } from "./CalendarTourPrintMembersList";
import { CalendarTourPrintPreviewPageShell } from "./CalendarTourPrintPreviewPageShell";
import { CalendarTourPrintSummaryTable } from "./CalendarTourPrintSummaryTable";

type CalendarTourPrintSummaryPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "summary" }>;
};

export function CalendarTourPrintSummaryPage({ page }: CalendarTourPrintSummaryPageProps) {
  return (
    <CalendarTourPrintPreviewPageShell orientation="portrait" testId="tour-print-summary-page">
      <header className="space-y-5 border-b border-slate-200 pb-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Tourenplanung</p>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold leading-tight text-slate-900" data-testid="tour-print-summary-headline">
              {page.headline}
            </h2>
            <p className="text-sm font-medium text-slate-600">{page.rangeLabel}</p>
          </div>
        </div>
      </header>

      <CalendarTourPrintMembersList members={page.members} />
      <CalendarTourPrintSummaryTable rows={page.rows} />
    </CalendarTourPrintPreviewPageShell>
  );
}
