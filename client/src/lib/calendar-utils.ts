import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CalendarAppointment } from "./calendar-appointments";
import { formatDisplayDate } from "@/lib/date-display-format";

export const CALENDAR_NEUTRAL_COLOR = "#CBD5E1";
export const CALENDAR_UNASSIGNED_TOUR_COLOR = "#64748b";

export function getAppointmentEndDate(appointment: CalendarAppointment) {
  return appointment.endDate ?? appointment.startDate;
}

export function getAppointmentDurationDays(appointment: CalendarAppointment) {
  return differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), parseISO(appointment.startDate));
}

export function getAppointmentStackPriority(appointment: CalendarAppointment) {
  const durationDays = getAppointmentDurationDays(appointment);
  if (durationDays > 0) return 0;
  if (!appointment.startTime) return 1;
  return 2;
}

export function getAppointmentTimeLabel(appointment: CalendarAppointment) {
  if (!appointment.startTime) return null;
  return appointment.startTime.slice(0, 5);
}

export function getAppointmentSortValue(appointment: CalendarAppointment) {
  const time = appointment.startTime ? appointment.startTime.slice(0, 5) : "00:00";
  return `${appointment.startDate}-${time}-${appointment.id}`;
}

export function getWeekAppointmentGridStartColumn(appointment: CalendarAppointment, days: Date[]) {
  const weekStart = days[0];
  const appointmentStart = parseISO(appointment.startDate);

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    if (days[dayIndex] >= appointmentStart) {
      return dayIndex + 1;
    }
  }

  return appointmentStart <= weekStart ? 1 : days.length;
}

export function getWeekAppointmentGridSpan(appointment: CalendarAppointment, days: Date[]) {
  const appointmentEnd = parseISO(getAppointmentEndDate(appointment));
  const startColumn = getWeekAppointmentGridStartColumn(appointment, days);
  let span = 1;

  for (let dayIndex = startColumn; dayIndex < days.length; dayIndex += 1) {
    if (days[dayIndex] > appointmentEnd) {
      break;
    }
    span += 1;
  }

  return Math.max(1, Math.min(span, days.length - startColumn + 1));
}

export function extractTourIndex(tourName: string | null): number | null {
  const normalizedName = tourName?.trim();
  if (!normalizedName) {
    return null;
  }
  const match = /^tour\s+(\d+)$/i.exec(normalizedName);
  if (!match) {
    return null;
  }
  const parsedIndex = Number.parseInt(match[1], 10);
  return Number.isFinite(parsedIndex) ? parsedIndex : null;
}

export function compareTourNamesForCalendar(aTourName: string | null, bTourName: string | null) {
  const aName = aTourName?.trim() ?? "";
  const bName = bTourName?.trim() ?? "";
  const aTourIndex = extractTourIndex(aName);
  const bTourIndex = extractTourIndex(bName);

  const aGroup = aTourIndex !== null ? 0 : aName.length > 0 ? 1 : 2;
  const bGroup = bTourIndex !== null ? 0 : bName.length > 0 ? 1 : 2;

  if (aGroup !== bGroup) {
    return aGroup - bGroup;
  }

  if (aGroup === 0 && aTourIndex !== null && bTourIndex !== null && aTourIndex !== bTourIndex) {
    return aTourIndex - bTourIndex;
  }

  return aName.localeCompare(bName, "de", { sensitivity: "base" });
}

export function compareAppointmentsByTourIndexThenTime(a: CalendarAppointment, b: CalendarAppointment) {
  const aTourName = a.tourName?.trim() ?? "";
  const bTourName = b.tourName?.trim() ?? "";
  const tourCompare = compareTourNamesForCalendar(aTourName, bTourName);
  if (tourCompare !== 0) {
    return tourCompare;
  }

  const aTime = a.startTime ? a.startTime.slice(0, 5) : "00:00";
  const bTime = b.startTime ? b.startTime.slice(0, 5) : "00:00";
  if (aTime !== bTime) {
    return aTime.localeCompare(bTime);
  }

  return a.id - b.id;
}

export function formatDateLabel(date: string) {
  return formatDisplayDate(parseISO(date), date);
}
