import React from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

import { buildDayGridTemplate, getDayWeights, normalizeWeekendColumnPercent } from "@/lib/calendar-layout";
import {
  formatTourPrintDateShort2y,
  formatTourPrintDayColumnLabel,
  isAppointmentContinuationDay,
  type TourPrintPreviewPage,
} from "@/lib/tour-print-preview";
import { PrintWeekPage } from "@/components/print/PrintWeekPage";
import { CalendarTourPrintAppointmentCard } from "./CalendarTourPrintAppointmentCard";
import { CalendarTourPrintContinuationCard } from "./CalendarTourPrintContinuationCard";

type CalendarTourPrintWeekPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "week" }>;
  weekendColumnPercent: number;
};

export function CalendarTourPrintWeekPage({ page, weekendColumnPercent }: CalendarTourPrintWeekPageProps) {
  const dayGridTemplate = buildDayGridTemplate(getDayWeights(normalizeWeekendColumnPercent(weekendColumnPercent)));
  const calendarWeek = format(parseISO(page.days[0].dateKey), "II", { locale: de });
  const weekStart = page.days[0].dateKey;
  const weekEnd = page.days[6].dateKey;

  return (
    <PrintWeekPage
      header={
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wochenplan</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">KW {calendarWeek}</h3>
          </div>
          <p className="text-sm font-medium text-slate-700">
            {formatTourPrintDateShort2y(weekStart)} &ndash; {formatTourPrintDateShort2y(weekEnd)}
          </p>
        </header>
      }
      days={page.days.map((day) => ({
        dateKey: day.dateKey,
        label: formatTourPrintDayColumnLabel(day.dateKey),
        children: day.appointments.map((appt) =>
          isAppointmentContinuationDay(appt, day.dateKey) ? (
            <CalendarTourPrintContinuationCard
              key={`cont-${day.dateKey}-${appt.id}`}
              appointment={appt}
              dateKey={day.dateKey}
            />
          ) : (
            <CalendarTourPrintAppointmentCard key={`${day.dateKey}-${appt.id}`} appointment={appt} />
          ),
        ),
      }))}
      gridTemplate={dayGridTemplate}
      testId={`tour-print-week-page-${page.weekIndex + 1}`}
      gridTestId={`tour-print-week-grid-${page.weekIndex + 1}`}
    />
  );
}
