import React from "react";
import type { ReactNode } from "react";
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
  const baseWeights = getDayWeights(normalizeWeekendColumnPercent(weekendColumnPercent));
  const adjustedWeights = baseWeights.map((weight, idx) => {
    if (idx < 5) return weight;
    return page.days[idx]?.appointments.length > 0 ? 1 : weight;
  });
  const dayGridTemplate = buildDayGridTemplate(adjustedWeights);
  const calendarWeek = format(parseISO(page.days[0].dateKey), "II", { locale: de });
  const weekStart = page.days[0].dateKey;
  const weekEnd = page.days[6].dateKey;

  const dayLabels = page.days.map((day, dayIdx) => ({
    dateKey: day.dateKey,
    label:
      dayIdx >= 5 && day.appointments.length === 0
        ? format(parseISO(day.dateKey), "EE", { locale: de })
        : formatTourPrintDayColumnLabel(day.dateKey),
  }));

  const rowCount = Math.max(0, ...page.days.map((d) => d.appointments.length));
  const appointmentRows: ReactNode[][] = Array.from({ length: rowCount }, (_, rowIdx) =>
    page.days.map((day) => {
      const appt = day.appointments[rowIdx];
      if (!appt) return null;
      return isAppointmentContinuationDay(appt, day.dateKey) ? (
        <CalendarTourPrintContinuationCard
          key={`cont-${day.dateKey}-${appt.id}`}
          appointment={appt}
          dateKey={day.dateKey}
        />
      ) : (
        <CalendarTourPrintAppointmentCard key={`${day.dateKey}-${appt.id}`} appointment={appt} />
      );
    }),
  );

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
      days={dayLabels}
      appointmentRows={appointmentRows}
      gridTemplate={dayGridTemplate}
      testId={`tour-print-week-page-${page.weekIndex + 1}`}
      gridTestId={`tour-print-week-grid-${page.weekIndex + 1}`}
    />
  );
}
