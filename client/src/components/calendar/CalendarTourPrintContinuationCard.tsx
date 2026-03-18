import React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { type TourPrintPreviewAppointment } from "@/lib/tour-print-preview";
import { PrintAppointmentSlot } from "@/components/print/PrintAppointmentSlot";

type CalendarTourPrintContinuationCardProps = {
  appointment: TourPrintPreviewAppointment;
  dateKey: string;
};

export function CalendarTourPrintContinuationCard({
  appointment,
  dateKey,
}: CalendarTourPrintContinuationCardProps) {
  const dayNumber = differenceInCalendarDays(parseISO(dateKey), parseISO(appointment.startDate)) + 1;

  return (
    <PrintAppointmentSlot
      testId={`tour-print-continuation-card-${appointment.id}-${dateKey}`}
      header={
        <div className="text-center text-[10px] font-semibold text-slate-500">Tag {dayNumber}</div>
      }
      body={
        <div
          className="mt-2 h-full rounded"
          style={{
            background:
              "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #f8fafc 4px, #f8fafc 12px)",
          }}
        />
      }
    />
  );
}
