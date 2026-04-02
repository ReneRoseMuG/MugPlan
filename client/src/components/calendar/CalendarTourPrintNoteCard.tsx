import React from "react";
import { format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  isReklamationAppointment,
  stripHtmlToText,
  type TourPrintPreviewAppointment,
} from "@/lib/tour-print-preview";

type Props = {
  appointment: TourPrintPreviewAppointment;
  weekStart: string;
};

function formatKwShort(dateStr: string): string {
  return `KW ${getISOWeek(parseISO(dateStr))}`;
}

function formatWeekday(dateStr: string): string {
  return format(parseISO(dateStr), "EEE", { locale: de }).replace(/\.$/, "");
}

export function CalendarTourPrintNoteCard({ appointment, weekStart }: Props) {
  const isReklamation = isReklamationAppointment(appointment);
  const localityLine = [appointment.customer.postalCode, appointment.customer.city].filter(Boolean).join(" ");
  const countryLine = appointment.customer.country?.trim() ?? "";

  return (
    <div
      className="break-before-avoid break-inside-avoid overflow-hidden rounded border border-slate-200"
      data-testid={`tour-print-note-card-${appointment.id}`}
    >
      <div className="flex items-start justify-between gap-4 bg-slate-100 px-3 py-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-900">
            {appointment.customer.fullName ?? appointment.customer.customerNumber}
          </p>
          {localityLine ? (
            <p className="text-[10px] text-slate-500">
              {localityLine}
            </p>
          ) : null}
          {countryLine ? <p className="text-[10px] text-slate-500">{countryLine}</p> : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 text-right">
          <p className="text-[10px] text-slate-500">
            {formatKwShort(weekStart)} | {formatWeekday(appointment.startDate)}
          </p>
          {isReklamation ? (
            <span
              className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700"
              data-testid={`tour-print-note-card-reklamation-${appointment.id}`}
            >
              Reklamation
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 bg-white px-3 py-2">
        {appointment.printNotes.map((note, index) => (
          <div key={`${note.id}-${index}`}>
            {note.title ? <p className="text-[10px] font-semibold text-slate-700">{note.title}</p> : null}
            <p className="text-[11px] leading-relaxed text-slate-700">{stripHtmlToText(note.body)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
