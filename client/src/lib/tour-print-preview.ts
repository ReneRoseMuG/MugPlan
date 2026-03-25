import { addDays, compareAsc, eachDayOfInterval, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { z } from "zod";
import { api } from "@shared/routes";

export type TourPrintPreviewResponse = z.infer<typeof api.tourPrintPreview.get.responses[200]>;
export type TourPrintPreviewAppointment = TourPrintPreviewResponse["appointments"][number];
export type TourPrintPreviewNote = TourPrintPreviewAppointment["printNotes"][number];

export type TourPrintSummaryRow = ReturnType<typeof buildTourPrintSummaryRows>[number];

export type TourPrintWeekPage = ReturnType<typeof buildTourPrintWeekPages>[number];

export type TourPrintPreviewPage =
  | {
      kind: "summary";
      pageIndex: number;
      pageNumber: number;
      title: string;
      orientation: "landscape";
      tourName: string;
      fromDate: string;
      toDate: string;
      rangeLabel: string;
      headline: string;
      members: TourPrintPreviewResponse["members"];
      rows: TourPrintSummaryRow[];
    }
  | {
      kind: "week";
      pageIndex: number;
      pageNumber: number;
      title: string;
      orientation: "landscape";
      rangeLabel: string;
      weekIndex: number;
      weekStart: string;
      weekEnd: string;
      days: TourPrintWeekPage["days"];
      weekNotes: TourPrintPreviewNote[];
    };

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

export function formatTourPrintDateShort2y(value: string): string {
  return format(parseISO(value), "dd.MM.yy", { locale: de });
}

export function formatTourPrintDayColumnLabel(dateKey: string): string {
  return format(parseISO(dateKey), "EE, dd.MM.yy", { locale: de });
}

export function isAppointmentContinuationDay(
  appointment: TourPrintPreviewAppointment,
  dateKey: string
): boolean {
  return appointment.startDate < dateKey;
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

export function buildTourPrintHeadline(data: TourPrintPreviewResponse): string {
  return `Tourenplanung fuer Tour ${data.tour.name} - Zeitraum ${formatTourPrintDate(data.fromDate)} / ${formatTourPrintDate(data.toDate)}`;
}

export function buildTourPrintWeekTitle(data: TourPrintPreviewResponse, weekStart: string, weekIndex: number): string {
  return `${data.tour.name} - Woche ${weekIndex + 1} - KW ${format(parseISO(weekStart), "II", { locale: de })}`;
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

export function resolvePrintNoteAccentColor(note: TourPrintPreviewNote): string {
  return note.cardColor?.trim() || "#cbd5e1";
}

export function resolvePrintNoteTintColor(note: TourPrintPreviewNote): string {
  const color = resolvePrintNoteAccentColor(note);
  return `${color}1a`;
}

export function getAppointmentDateKeys(appointment: TourPrintPreviewAppointment): string[] {
  return eachDayOfInterval({
    start: parseISO(appointment.startDate),
    end: parseISO(appointment.endDate ?? appointment.startDate),
  }).map((date) => format(date, "yyyy-MM-dd"));
}

export function buildTourPrintPages(data: TourPrintPreviewResponse): TourPrintPreviewPage[] {
  const rangeLabel = buildTourPrintDateRange(data);
  const summaryPage: TourPrintPreviewPage = {
    kind: "summary",
    pageIndex: 0,
    pageNumber: 1,
    title: `Seite 1 - ${data.tour.name}`,
    orientation: "landscape",
    tourName: data.tour.name,
    fromDate: data.fromDate,
    toDate: data.toDate,
    rangeLabel,
    headline: buildTourPrintHeadline(data),
    members: data.members,
    rows: buildTourPrintSummaryRows(data),
  };

  const weekPages = buildTourPrintWeekPages(data).map<TourPrintPreviewPage>((week, weekIndex) => ({
    kind: "week",
    pageIndex: weekIndex + 1,
    pageNumber: weekIndex + 2,
    title: buildTourPrintWeekTitle(data, week.weekStart, weekIndex),
    orientation: "landscape",
    rangeLabel: `${formatTourPrintDate(week.weekStart)} / ${formatTourPrintDate(week.weekEnd)}`,
    weekIndex,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    days: week.days,
    weekNotes: data.weeks[weekIndex]?.weekNotes ?? [],
  }));

  return [summaryPage, ...weekPages];
}
