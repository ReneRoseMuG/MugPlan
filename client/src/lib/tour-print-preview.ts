import { addDays, compareAsc, eachDayOfInterval, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { z } from "zod";
import { api } from "@shared/routes";

export type TourPrintPreviewResponse = z.infer<typeof api.tourPrintPreview.get.responses[200]>;
export type TourPrintPreviewAppointment = TourPrintPreviewResponse["appointments"][number];

export function normalizeTourPrintWeekCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.trunc(value), 12));
}

export function formatTourPrintDate(value: string): string {
  return format(parseISO(value), "dd.MM.yyyy", { locale: de });
}

export function formatTourPrintDateShort(value: string): string {
  return format(parseISO(value), "EE dd.MM.", { locale: de });
}

export function stripHtmlToText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTourPrintSummaryRows(data: TourPrintPreviewResponse) {
  return [...data.appointments]
    .sort((a, b) => compareAsc(parseISO(a.startDate), parseISO(b.startDate)) || a.id - b.id)
    .map((appointment) => ({
      id: appointment.id,
      dateLabel: formatTourPrintDate(appointment.startDate),
      durationDays: appointment.durationDays,
      saunaModel: appointment.saunaModel ?? "-",
      postalCode: appointment.customer.postalCode ?? "-",
    }));
}

export function buildWeekDateKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStart), index), "yyyy-MM-dd"));
}

export function appointmentOverlapsDate(appointment: TourPrintPreviewAppointment, dateKey: string): boolean {
  const startDate = appointment.startDate;
  const endDate = appointment.endDate ?? appointment.startDate;
  return startDate <= dateKey && endDate >= dateKey;
}

export function buildTourPrintWeekPages(data: TourPrintPreviewResponse) {
  return data.weeks.map((week) => ({
    ...week,
    days: buildWeekDateKeys(week.weekStart).map((dateKey) => ({
      dateKey,
      appointments: data.appointments.filter((appointment) => appointmentOverlapsDate(appointment, dateKey)),
    })),
  }));
}

export function buildTourPrintDateRange(data: TourPrintPreviewResponse): string {
  return `${formatTourPrintDate(data.fromDate)} bis ${formatTourPrintDate(data.toDate)}`;
}

export function getAppointmentPrimaryLocation(appointment: TourPrintPreviewAppointment): string {
  const locationParts = [
    appointment.customer.fullName ?? appointment.customer.customerNumber,
    appointment.customer.postalCode,
    appointment.customer.city,
  ].filter((value): value is string => Boolean(value && value.trim()));
  return locationParts.join(", ");
}

export function buildPrintNotesText(appointment: TourPrintPreviewAppointment): string[] {
  return appointment.printNotes
    .map((note) => stripHtmlToText(note.body))
    .filter((value) => value.length > 0);
}

export function getAppointmentDateKeys(appointment: TourPrintPreviewAppointment): string[] {
  return eachDayOfInterval({
    start: parseISO(appointment.startDate),
    end: parseISO(appointment.endDate ?? appointment.startDate),
  }).map((date) => format(date, "yyyy-MM-dd"));
}
