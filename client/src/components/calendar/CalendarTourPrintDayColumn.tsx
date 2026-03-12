import React from "react";

import { formatTourPrintDateShort, type TourPrintPreviewAppointment } from "@/lib/tour-print-preview";
import { CalendarTourPrintAppointmentCard } from "./CalendarTourPrintAppointmentCard";

type CalendarTourPrintDayColumnProps = {
  dateKey: string;
  appointments: TourPrintPreviewAppointment[];
};

export function CalendarTourPrintDayColumn({ dateKey, appointments }: CalendarTourPrintDayColumnProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50" data-testid={`tour-print-day-column-${dateKey}`}>
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        {formatTourPrintDateShort(dateKey)}
      </div>
      <div className="flex min-h-[540px] flex-col gap-2 px-2 py-2" data-testid={`tour-print-day-${dateKey}`}>
        {appointments.map((appointment) => (
          <CalendarTourPrintAppointmentCard key={`${dateKey}-${appointment.id}`} appointment={appointment} />
        ))}
      </div>
    </div>
  );
}
