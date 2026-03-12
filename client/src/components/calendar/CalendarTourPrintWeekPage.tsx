import React from "react";

import { CalendarTourPrintPreviewPageShell } from "./CalendarTourPrintPreviewPageShell";
import { CalendarTourPrintDayColumn } from "./CalendarTourPrintDayColumn";
import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import type { TourPrintPreviewPage } from "@/lib/tour-print-preview";

type CalendarTourPrintWeekPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "week" }>;
  weekendColumnPercent: number;
};

export function CalendarTourPrintWeekPage({ page, weekendColumnPercent }: CalendarTourPrintWeekPageProps) {
  const dayGridTemplate = buildDayGridTemplate(getDayWeights(normalizeWeekendColumnPercent(weekendColumnPercent)));

  return (
    <CalendarTourPrintPreviewPageShell
      orientation="landscape"
      testId={`tour-print-week-page-${page.weekIndex + 1}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wochenansicht</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{page.title}</h3>
        </div>
        <p className="text-sm font-medium text-slate-700">{page.rangeLabel}</p>
      </header>

      <div className="grid gap-3" style={{ gridTemplateColumns: dayGridTemplate }} data-testid={`tour-print-week-grid-${page.weekIndex + 1}`}>
        {page.days.map((day) => (
          <CalendarTourPrintDayColumn key={day.dateKey} dateKey={day.dateKey} appointments={day.appointments} />
        ))}
      </div>
    </CalendarTourPrintPreviewPageShell>
  );
}
