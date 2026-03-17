import React from "react";

import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import { formatTourPrintDateShort, type TourPrintPreviewPage } from "@/lib/tour-print-preview";
import { PrintWeekPage } from "@/components/print/PrintWeekPage";
import { CalendarTourPrintAppointmentCard } from "./CalendarTourPrintAppointmentCard";

type CalendarTourPrintWeekPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "week" }>;
  weekendColumnPercent: number;
};

export function CalendarTourPrintWeekPage({ page, weekendColumnPercent }: CalendarTourPrintWeekPageProps) {
  const dayGridTemplate = buildDayGridTemplate(getDayWeights(normalizeWeekendColumnPercent(weekendColumnPercent)));

  return (
    <PrintWeekPage
      header={
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wochenansicht</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{page.title}</h3>
          </div>
          <p className="text-sm font-medium text-slate-700">{page.rangeLabel}</p>
        </header>
      }
      days={page.days.map((day) => ({
        dateKey: day.dateKey,
        label: formatTourPrintDateShort(day.dateKey),
        children: day.appointments.map((appt) => (
          <CalendarTourPrintAppointmentCard key={`${day.dateKey}-${appt.id}`} appointment={appt} />
        )),
      }))}
      gridTemplate={dayGridTemplate}
      testId={`tour-print-week-page-${page.weekIndex + 1}`}
      gridTestId={`tour-print-week-grid-${page.weekIndex + 1}`}
    />
  );
}
