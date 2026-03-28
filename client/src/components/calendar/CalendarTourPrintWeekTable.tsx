import React from "react";
import {
  TOUR_PRINT_TABLE_COLUMN_WIDTHS,
  type TourPrintWeekChunk,
} from "@/lib/tour-print-preview";
import { CalendarTourPrintAppointmentRow } from "./CalendarTourPrintAppointmentRow";

type Props = {
  week: TourPrintWeekChunk;
};

export function CalendarTourPrintWeekTable({ week }: Props) {
  if (week.appointments.length === 0) return null;

  return (
    <table
      className="w-full border-collapse text-left"
      style={{ tableLayout: "fixed" }}
      data-testid="tour-print-week-table"
    >
      <colgroup>
        {TOUR_PRINT_TABLE_COLUMN_WIDTHS.map((width) => (
          <col key={width} style={{ width }} />
        ))}
      </colgroup>
      <thead>
        <tr className="border-b border-slate-200">
          <th className="pb-1 pr-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Datum/Zeit</th>
          <th className="pb-1 pr-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Kunde</th>
          <th className="pb-1 pr-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Projekt</th>
          <th className="pb-1 pr-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Mitarbeiter</th>
          <th className="pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Info</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {week.appointments.map((appointment) => (
          <CalendarTourPrintAppointmentRow key={appointment.id} appointment={appointment} />
        ))}
      </tbody>
    </table>
  );
}
