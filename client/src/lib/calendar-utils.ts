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

export function compareAppointmentsByTourIndexThenTime(a: CalendarAppointment, b: CalendarAppointment) {
  const aTourName = a.tourName?.trim() ?? "";
  const bTourName = b.tourName?.trim() ?? "";
  const aTourIndex = extractTourIndex(aTourName);
  const bTourIndex = extractTourIndex(bTourName);

  const aGroup = aTourIndex !== null ? 0 : aTourName.length > 0 ? 1 : 2;
  const bGroup = bTourIndex !== null ? 0 : bTourName.length > 0 ? 1 : 2;

  if (aGroup !== bGroup) {
    return aGroup - bGroup;
  }

  if (aGroup === 0 && bTourIndex !== null && aTourIndex !== null && aTourIndex !== bTourIndex) {
    return aTourIndex - bTourIndex;
  }

  if (aGroup === 1) {
    const nameCompare = aTourName.localeCompare(bTourName, "de", { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }
  }

  const aTime = a.startTime ? a.startTime.slice(0, 5) : "00:00";
  const bTime = b.startTime ? b.startTime.slice(0, 5) : "00:00";
  if (aTime !== bTime) {
    return aTime.localeCompare(bTime);
  }

  return a.id - b.id;
}

export function formatDateLabel(date: string) {
  return format(parseISO(date), "dd.MM.yyyy");
}
