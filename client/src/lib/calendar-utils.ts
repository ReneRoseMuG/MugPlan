import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { CalendarAppointment } from "./calendar-appointments";

export const CALENDAR_NEUTRAL_COLOR = "#CBD5E1";

export function getAppointmentEndDate(appointment: CalendarAppointment) {
  return appointment.endDate ?? appointment.startDate;
}

export function getAppointmentDurationDays(appointment: CalendarAppointment) {
  return differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), parseISO(appointment.startDate));
}

export function getAppointmentTimeLabel(appointment: CalendarAppointment) {
  if (!appointment.startTime) return null;
  return appointment.startTime.slice(0, 5);
}

export function getAppointmentSortValue(appointment: CalendarAppointment) {
  const time = appointment.startTime ? appointment.startTime.slice(0, 5) : "00:00";
  return `${appointment.startDate}-${time}-${appointment.id}`;
}

export function formatDateLabel(date: string) {
  return format(parseISO(date), "dd.MM.yyyy");
}
