import { compareAsc, format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { isManagedReportExclusionTagName } from "@shared/appointmentCancellation";
import type { z } from "zod";
import { api } from "@shared/routes";
import { mergeTourPrintTags } from "./tag-utils";

export const TOUR_PRINT_PAGE_WIDTH_MM = 297;
export const TOUR_PRINT_PAGE_HEIGHT_MM = 210;
export const TOUR_PRINT_PAGE_PADDING_MM = 10;
export const TOUR_PRINT_INNER_WIDTH_MM = TOUR_PRINT_PAGE_WIDTH_MM - (TOUR_PRINT_PAGE_PADDING_MM * 2);
export const TOUR_PRINT_TABLE_COLUMN_WIDTHS = ["17%", "26%", "22%", "16%", "19%"] as const;

const PAGE_CONTENT_CAPACITY = 190;
const PAGE_HEADER_HEIGHT = 32;
const WEEK_HEADER_HEIGHT = 10;
const WEEK_CONTINUATION_BADGE_HEIGHT = 5;
const WEEK_NOTE_BASE_HEIGHT = 10;
const WEEK_NOTE_LINE_HEIGHT = 4;
const TABLE_HEADER_HEIGHT = 8;
const APPOINTMENT_ROW_BASE_HEIGHT = 6;
const APPOINTMENT_ROW_LINE_HEIGHT = 4;
const ADDITIONAL_INFO_HEADING_HEIGHT = 10;
const NOTE_CARD_BASE_HEIGHT = 16;
const NOTE_CARD_LINE_HEIGHT = 4;
const MIN_ROW_HEIGHT = 14;
const MIN_NOTE_CARD_HEIGHT = 18;

export type TourPrintPreviewResponse = z.infer<typeof api.tourPrintPreview.get.responses[200]>;
export type TourPrintPreviewAppointment = TourPrintPreviewResponse["appointments"][number];
export type TourPrintPreviewNote = TourPrintPreviewAppointment["printNotes"][number];
export type TourPrintWeek = {
  weekStart: string;
  weekEnd: string;
  weekNotes: TourPrintPreviewResponse["weeks"][number]["weekNotes"];
  appointments: TourPrintPreviewAppointment[];
};

export type TourPrintWeekChunk = TourPrintWeek & {
  continuedFromPrevious: boolean;
  continuesOnNext: boolean;
  showWeekNotes: boolean;
};

export type TourPrintAdditionalInfoCard = {
  appointment: TourPrintPreviewAppointment;
  weekStart: string;
};

export type TourPrintPreviewPage = {
  kind: "list";
  pageIndex: number;
  pageNumber: number;
  title: string;
  orientation: "landscape";
  tourName: string;
  fromDate: string;
  toDate: string;
  rangeLabel: string;
  weeks: TourPrintWeekChunk[];
  additionalInfoCards: TourPrintAdditionalInfoCard[];
  showAdditionalInfoHeading: boolean;
  additionalInfoContinued: boolean;
};

type TourPrintDocumentMeta = Pick<TourPrintPreviewPage, "kind" | "orientation" | "tourName" | "fromDate" | "toDate" | "rangeLabel">;

type WorkingPage = TourPrintPreviewPage & {
  remainingHeight: number;
};

function buildPageTitle(tourName: string, pageNumber: number): string {
  return `${tourName} - Seite ${pageNumber}`;
}

function createWorkingPage(meta: TourPrintDocumentMeta, pageIndex: number): WorkingPage {
  return {
    ...meta,
    pageIndex,
    pageNumber: pageIndex + 1,
    title: buildPageTitle(meta.tourName, pageIndex + 1),
    weeks: [],
    additionalInfoCards: [],
    showAdditionalInfoHeading: false,
    additionalInfoContinued: false,
    remainingHeight: PAGE_CONTENT_CAPACITY - PAGE_HEADER_HEIGHT,
  };
}

function finalizePages(pages: WorkingPage[], meta: TourPrintDocumentMeta): TourPrintPreviewPage[] {
  const sourcePages = pages.length > 0 ? pages : [createWorkingPage(meta, 0)];
  return sourcePages.map(({ remainingHeight: _remainingHeight, ...page }, index) => ({
    ...page,
    pageIndex: index,
    pageNumber: index + 1,
    title: buildPageTitle(meta.tourName, index + 1),
  }));
}

function countWrappedLines(text: string, charsPerLine: number): number {
  if (!text.trim()) return 0;
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / charsPerLine)), 0);
}

function estimateWeekNotesHeight(notes: TourPrintPreviewNote[]): number {
  if (notes.length === 0) return 0;
  const textLines = notes.reduce((sum, note) => sum + Math.max(1, countWrappedLines(stripHtmlToText(note.body), 88)), 0);
  return WEEK_NOTE_BASE_HEIGHT + (textLines * WEEK_NOTE_LINE_HEIGHT);
}

function estimateAppointmentRowHeight(appointment: TourPrintPreviewAppointment): number {
  const mergedTags = mergeTourPrintTags(appointment.appointmentTags, appointment.customerTags, appointment.projectTags);
  const customerLines = appointment.customer.postalCode || appointment.customer.city ? 2 : 1;
  const employeeLines = Math.max(1, appointment.employees.length || 1);
  const infoText = mergedTags.map((tag) => tag.name).join(" ");
  const infoLines = Math.max(1, countWrappedLines(infoText, 20));
  const projectLines = appointment.projectName.trim() ? Math.max(1, countWrappedLines(appointment.projectName, 24)) : 1;
  const lineCount = Math.max(customerLines, employeeLines, infoLines, projectLines, 1);
  return APPOINTMENT_ROW_BASE_HEIGHT + (lineCount * APPOINTMENT_ROW_LINE_HEIGHT);
}

function estimateNoteCardHeight(card: TourPrintAdditionalInfoCard): number {
  const addressLine = [card.appointment.customer.postalCode, card.appointment.customer.city].filter(Boolean).join(" ");
  const headerLines = addressLine ? 2 : 1;
  const noteLines = card.appointment.printNotes.reduce((sum, note) => {
    const titleLines = note.title ? 1 : 0;
    const bodyLines = Math.max(1, countWrappedLines(stripHtmlToText(note.body), 86));
    return sum + titleLines + bodyLines;
  }, 0);
  return NOTE_CARD_BASE_HEIGHT + ((headerLines + noteLines) * NOTE_CARD_LINE_HEIGHT);
}

function compareAppointmentsChronologically(a: TourPrintPreviewAppointment, b: TourPrintPreviewAppointment): number {
  const aDateTime = `${a.startDate}T${a.startTime ?? "00:00:00"}`;
  const bDateTime = `${b.startDate}T${b.startTime ?? "00:00:00"}`;
  return compareAsc(parseISO(aDateTime), parseISO(bDateTime));
}

function collectAdditionalInfoCards(weeks: TourPrintWeek[]): TourPrintAdditionalInfoCard[] {
  return weeks
    .flatMap((week) => week.appointments
      .filter((appointment) => appointment.printNotes.length > 0)
      .map((appointment) => ({ appointment, weekStart: week.weekStart })))
    .sort((left, right) => compareAppointmentsChronologically(left.appointment, right.appointment));
}

function ensurePageWithSpace(pages: WorkingPage[], meta: TourPrintDocumentMeta, minimumRequiredHeight: number): WorkingPage {
  const current = pages[pages.length - 1];
  if (!current) {
    const page = createWorkingPage(meta, 0);
    pages.push(page);
    return page;
  }

  if (current.remainingHeight >= minimumRequiredHeight) {
    return current;
  }

  const page = createWorkingPage(meta, pages.length);
  pages.push(page);
  return page;
}

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

export function stripHtmlToText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAppointmentPrimaryLocation(appointment: TourPrintPreviewAppointment): string {
  const locationParts = [
    appointment.customer.fullName ?? appointment.customer.customerNumber,
    appointment.customer.postalCode,
    appointment.customer.city,
  ].filter((value): value is string => Boolean(value && value.trim()));
  return locationParts.join(", ");
}

export function resolvePrintNoteAccentColor(note: TourPrintPreviewNote): string {
  return note.cardColor?.trim() || "#cbd5e1";
}

export function resolvePrintNoteTintColor(note: TourPrintPreviewNote): string {
  const color = resolvePrintNoteAccentColor(note);
  return `${color}1a`;
}

export function buildTourPrintDateRange(data: TourPrintPreviewResponse): string {
  return `${formatTourPrintDate(data.fromDate)} bis ${formatTourPrintDate(data.toDate)}`;
}

export function formatEmployeeShortName(fullName: string): string {
  if (!fullName) return "";
  const commaIndex = fullName.indexOf(",");
  if (commaIndex === -1) return fullName;
  const lastName = fullName.slice(0, commaIndex).trim();
  const firstName = fullName.slice(commaIndex + 1).trim();
  if (!firstName) return lastName;
  return `${firstName} ${lastName.charAt(0)}.`;
}

export function isReklamationAppointment(appointment: TourPrintPreviewAppointment): boolean {
  const tags = mergeTourPrintTags(appointment.appointmentTags, appointment.customerTags, appointment.projectTags);
  if (tags.some((tag) => isManagedReportExclusionTagName(tag.name))) return true;
  return appointment.printNotes.some((note) => isManagedReportExclusionTagName(note.title));
}

function sortAppointmentsForDay(appointments: TourPrintPreviewAppointment[]): TourPrintPreviewAppointment[] {
  return [...appointments].sort((left, right) => {
    const leftIsReklamation = isReklamationAppointment(left);
    const rightIsReklamation = isReklamationAppointment(right);
    if (leftIsReklamation !== rightIsReklamation) return leftIsReklamation ? 1 : -1;
    const leftDateTime = left.startDate + (left.startTime ? `T${left.startTime}` : "T00:00:00");
    const rightDateTime = right.startDate + (right.startTime ? `T${right.startTime}` : "T00:00:00");
    return compareAsc(parseISO(leftDateTime), parseISO(rightDateTime));
  });
}

function buildDocumentWeeks(data: TourPrintPreviewResponse): TourPrintWeek[] {
  return data.weeks.map((week, index) => {
    const weekAppointments = data.appointments.filter((appointment) => appointment.startDate >= week.weekStart && appointment.startDate <= week.weekEnd);
    const groupedByStartDate = new Map<string, TourPrintPreviewAppointment[]>();
    for (const appointment of weekAppointments) {
      const bucket = groupedByStartDate.get(appointment.startDate) ?? [];
      bucket.push(appointment);
      groupedByStartDate.set(appointment.startDate, bucket);
    }

    const appointments: TourPrintPreviewAppointment[] = [];
    for (const startDate of Array.from(groupedByStartDate.keys()).sort()) {
      appointments.push(...sortAppointmentsForDay(groupedByStartDate.get(startDate)!));
    }

    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weekNotes: data.weeks[index]?.weekNotes ?? [],
      appointments,
    };
  });
}

function paginateWeeks(meta: TourPrintDocumentMeta, weeks: TourPrintWeek[]): WorkingPage[] {
  const pages: WorkingPage[] = [];

  for (const week of weeks) {
    const weekNoteHeight = estimateWeekNotesHeight(week.weekNotes);
    const staticWeekHeight = WEEK_HEADER_HEIGHT + weekNoteHeight;

    if (week.appointments.length === 0) {
      const page = ensurePageWithSpace(pages, meta, staticWeekHeight || WEEK_HEADER_HEIGHT);
      page.weeks.push({
        ...week,
        continuedFromPrevious: false,
        continuesOnNext: false,
        showWeekNotes: true,
      });
      page.remainingHeight -= staticWeekHeight || WEEK_HEADER_HEIGHT;
      continue;
    }

    let appointmentIndex = 0;
    let continuedFromPrevious = false;

    while (appointmentIndex < week.appointments.length) {
      const minimumRequiredHeight = staticWeekHeight
        + TABLE_HEADER_HEIGHT
        + (continuedFromPrevious ? WEEK_CONTINUATION_BADGE_HEIGHT : 0)
        + MIN_ROW_HEIGHT;
      const page = ensurePageWithSpace(pages, meta, minimumRequiredHeight);
      const chunkAppointments: TourPrintPreviewAppointment[] = [];
      let chunkHeight = WEEK_HEADER_HEIGHT + TABLE_HEADER_HEIGHT + (continuedFromPrevious ? WEEK_CONTINUATION_BADGE_HEIGHT : 0);
      const showWeekNotes = !continuedFromPrevious;

      if (showWeekNotes) {
        chunkHeight += weekNoteHeight;
      }

      while (appointmentIndex < week.appointments.length) {
        const nextAppointment = week.appointments[appointmentIndex];
        const nextRowHeight = estimateAppointmentRowHeight(nextAppointment);
        const wouldExceedPage = chunkHeight + nextRowHeight > page.remainingHeight;

        if (wouldExceedPage && chunkAppointments.length > 0) {
          break;
        }

        chunkAppointments.push(nextAppointment);
        chunkHeight += nextRowHeight;
        appointmentIndex += 1;

        if (wouldExceedPage) {
          break;
        }
      }

      page.weeks.push({
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        weekNotes: showWeekNotes ? week.weekNotes : [],
        appointments: chunkAppointments,
        continuedFromPrevious,
        continuesOnNext: appointmentIndex < week.appointments.length,
        showWeekNotes,
      });
      page.remainingHeight -= chunkHeight;
      continuedFromPrevious = appointmentIndex < week.appointments.length;
    }
  }

  return pages;
}

function paginateAdditionalInfo(
  pages: WorkingPage[],
  meta: TourPrintDocumentMeta,
  cards: TourPrintAdditionalInfoCard[],
): WorkingPage[] {
  if (cards.length === 0) return pages;

  const targetPages = pages.slice();
  let cardIndex = 0;
  let continued = false;

  while (cardIndex < cards.length) {
    const page = ensurePageWithSpace(
      targetPages,
      meta,
      (continued ? 0 : ADDITIONAL_INFO_HEADING_HEIGHT) + MIN_NOTE_CARD_HEIGHT,
    );
    let headingConsumed = false;

    if (!page.showAdditionalInfoHeading) {
      page.showAdditionalInfoHeading = true;
      page.additionalInfoContinued = continued;
      page.remainingHeight -= ADDITIONAL_INFO_HEADING_HEIGHT;
      headingConsumed = true;
    }

    while (cardIndex < cards.length) {
      const nextCard = cards[cardIndex];
      const nextCardHeight = estimateNoteCardHeight(nextCard);
      const fits = page.remainingHeight >= nextCardHeight;

      if (!fits && page.additionalInfoCards.length > 0) {
        const overflowPage = createWorkingPage(meta, targetPages.length);
        overflowPage.showAdditionalInfoHeading = true;
        overflowPage.additionalInfoContinued = true;
        overflowPage.remainingHeight -= ADDITIONAL_INFO_HEADING_HEIGHT;
        targetPages.push(overflowPage);
        break;
      }

      if (!fits && headingConsumed) {
        const overflowPage = createWorkingPage(meta, targetPages.length);
        overflowPage.showAdditionalInfoHeading = true;
        overflowPage.additionalInfoContinued = true;
        overflowPage.remainingHeight -= ADDITIONAL_INFO_HEADING_HEIGHT;
        targetPages.push(overflowPage);
        break;
      }

      page.additionalInfoCards.push(nextCard);
      page.remainingHeight -= nextCardHeight;
      cardIndex += 1;
      headingConsumed = false;
    }

    continued = true;
  }

  return targetPages;
}

export function buildTourPrintPages(data: TourPrintPreviewResponse): TourPrintPreviewPage[] {
  const weeks = buildDocumentWeeks(data);
  const meta: TourPrintDocumentMeta = {
    kind: "list",
    orientation: "landscape",
    tourName: data.tour.name,
    fromDate: data.fromDate,
    toDate: data.toDate,
    rangeLabel: buildTourPrintDateRange(data),
  };

  const weekPages = paginateWeeks(meta, weeks);
  const pagesWithAdditionalInfo = paginateAdditionalInfo(weekPages, meta, collectAdditionalInfoCards(weeks));
  return finalizePages(pagesWithAdditionalInfo, meta);
}

export function getTourPrintKwRange(weeks: Array<Pick<TourPrintWeek, "weekStart">>, fromDate: string, toDate: string): string {
  const firstWeekDate = weeks[0]?.weekStart ?? fromDate;
  const lastWeekDate = weeks[weeks.length - 1]?.weekStart ?? toDate;
  const firstWeek = getISOWeek(parseISO(firstWeekDate));
  const lastWeek = getISOWeek(parseISO(lastWeekDate));
  return firstWeek === lastWeek ? `KW ${firstWeek}` : `KW ${firstWeek}-${lastWeek}`;
}
