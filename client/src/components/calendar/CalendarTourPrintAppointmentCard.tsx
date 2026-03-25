import React from "react";
import type { ReactNode } from "react";
import { Calendar, Clock } from "lucide-react";

import { type TourPrintPreviewAppointment } from "@/lib/tour-print-preview";
import { PrintAppointmentSlot } from "@/components/print/PrintAppointmentSlot";
import { CalendarTourPrintNoteBlock } from "./CalendarTourPrintNoteBlock";

type CalendarTourPrintAppointmentCardProps = {
  appointment: TourPrintPreviewAppointment;
};

function resolveAppointmentHeader(appointment: TourPrintPreviewAppointment): ReactNode {
  const right = <span>{appointment.customer.postalCode}</span>;

  if (appointment.startTime !== null) {
    return (
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {appointment.startTime.slice(0, 5)}
        </span>
        {right}
      </div>
    );
  }

  if (appointment.durationDays === 1) {
    return (
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          1 Tag
        </span>
        {right}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
      <span className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {appointment.durationDays} Tage&nbsp;&nbsp;Tag 1
      </span>
      {right}
    </div>
  );
}

export function CalendarTourPrintAppointmentCard({ appointment }: CalendarTourPrintAppointmentCardProps) {
  return (
    <PrintAppointmentSlot
      testId={`tour-print-appointment-card-${appointment.id}`}
      header={resolveAppointmentHeader(appointment)}
      body={
        <div className="mt-2 space-y-1">
          <p className="text-[12px] font-semibold leading-4 text-slate-900">{appointment.projectName}</p>
          <p className="text-[11px] leading-4 text-slate-700">{appointment.customer.fullName}</p>
          <p className="text-[11px] leading-4 text-slate-700">{appointment.customer.city}</p>
          {appointment.printNotes.length > 0 && (
            <div className="mt-2 space-y-2">
              {appointment.printNotes.map((note, index) => (
                <CalendarTourPrintNoteBlock
                  key={`${appointment.id}-note-${note.id}-${index}`}
                  note={note}
                  appointmentId={appointment.id}
                  noteIndex={index}
                />
              ))}
            </div>
          )}
        </div>
      }
      footer={
        appointment.employees.length > 0
          ? (
            <div className="flex flex-col gap-1">
              {appointment.employees.map((employee) => (
                <span
                  key={employee.id}
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 leading-none"
                >
                  {employee.fullName}
                </span>
              ))}
            </div>
          )
          : undefined
      }
    />
  );
}
