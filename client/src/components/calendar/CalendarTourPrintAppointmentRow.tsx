import React from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  formatEmployeeShortName,
  isReklamationAppointment,
  type TourPrintPreviewAppointment,
} from "@/lib/tour-print-preview";
import { mergeTourPrintTags, trimTagLabel } from "@/lib/tag-utils";

type Props = {
  appointment: TourPrintPreviewAppointment;
};

function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "EE", { locale: de }).replace(/\.$/, "");
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function formatDateTimeCell(appointment: TourPrintPreviewAppointment): { label: string; isRek: boolean } {
  const isReklamation = isReklamationAppointment(appointment);
  const dayLabel = formatDateShort(appointment.startDate);

  if (isReklamation) {
    return { label: `${dayLabel}.`, isRek: true };
  }

  if (appointment.durationDays > 1) {
    const endDay = appointment.endDate ? formatDateShort(appointment.endDate) : "";
    return { label: `${dayLabel}. - ${endDay}. ${appointment.durationDays} Tage`, isRek: false };
  }

  const time = appointment.startTime ? formatTime(appointment.startTime) : "1 Tag";
  return { label: `${dayLabel}. ${time}`, isRek: false };
}

export function CalendarTourPrintAppointmentRow({ appointment }: Props) {
  const isReklamation = isReklamationAppointment(appointment);
  const { label, isRek: dateIsReklamation } = formatDateTimeCell(appointment);
  const tags = mergeTourPrintTags(appointment.appointmentTags, appointment.customerTags, appointment.projectTags);

  return (
    <tr className={isReklamation ? "bg-red-50" : ""} data-testid={`tour-print-appointment-row-${appointment.id}`}>
      <td className={`py-1 pr-2 text-[11px] align-top whitespace-nowrap overflow-hidden${dateIsReklamation ? " italic text-red-600" : " text-slate-700"}`}>
        {dateIsReklamation ? (
          <>
            {label} <em className="not-italic italic text-red-600">Reklamation</em>
          </>
        ) : (
          label
        )}
      </td>
      <td className="py-1 pr-2 align-top overflow-hidden">
        <p className="text-[11px] font-semibold leading-tight text-slate-900 truncate">
          {appointment.customer.fullName ?? appointment.customer.customerNumber}
        </p>
        {(appointment.customer.postalCode || appointment.customer.city) ? (
          <p className="text-[10px] leading-tight text-slate-500">
            {[appointment.customer.postalCode, appointment.customer.city].filter(Boolean).join(" ")}
          </p>
        ) : null}
      </td>
      <td className="py-1 pr-2 text-[11px] align-top text-slate-700 overflow-hidden truncate">
        {isReklamation ? null : appointment.projectName || null}
      </td>
      <td className="py-1 pr-2 align-top overflow-hidden">
        {appointment.employees.map((employee) => (
          <p key={employee.id} className="text-[10px] leading-tight text-slate-500 truncate">
            {formatEmployeeShortName(employee.fullName)}
          </p>
        ))}
      </td>
      <td className="py-1 align-top">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-0.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-600"
                data-testid={`tour-print-tag-pill-${appointment.id}-${tag.id}`}
              >
                {trimTagLabel(tag.name)}
              </span>
            ))}
          </div>
        ) : null}
      </td>
    </tr>
  );
}
