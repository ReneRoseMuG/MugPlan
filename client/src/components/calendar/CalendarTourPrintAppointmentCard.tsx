import React from "react";

import {
  getAppointmentPrimaryLocation,
  type TourPrintPreviewAppointment,
} from "@/lib/tour-print-preview";
import { CalendarTourPrintNoteBlock } from "./CalendarTourPrintNoteBlock";

type CalendarTourPrintAppointmentCardProps = {
  appointment: TourPrintPreviewAppointment;
};

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : "Ganztag";
}

export function CalendarTourPrintAppointmentCard({ appointment }: CalendarTourPrintAppointmentCardProps) {
  return (
    <article
      className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm"
      data-testid={`tour-print-appointment-card-${appointment.id}`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <span>{formatTime(appointment.startTime)}</span>
        <span>{appointment.durationDays} T</span>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-[12px] font-semibold leading-4 text-slate-900">{appointment.projectName}</p>
        <p className="text-[11px] leading-4 text-slate-700">{getAppointmentPrimaryLocation(appointment)}</p>
        {appointment.saunaModel ? <p className="text-[11px] leading-4 text-slate-700">Saunamodell: {appointment.saunaModel}</p> : null}
      </div>
      {appointment.printNotes.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-2">
          {appointment.printNotes.map((note, index) => (
            <CalendarTourPrintNoteBlock
              key={`${appointment.id}-note-${note.id}-${index}`}
              note={note}
              appointmentId={appointment.id}
              noteIndex={index}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
