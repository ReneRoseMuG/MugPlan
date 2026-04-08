import { format, getISOWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  isManagedMesseTagName,
  isManagedReportExclusionTagName,
  isManagedSpecialMeasureTagName,
} from "@shared/appointmentCancellation";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";
import type { z } from "zod";
import { api } from "@shared/routes";
import { formatEmployeeShortName, stripHtmlToText } from "@/lib/tour-print-preview";

export type TourenplanPrintMode = "farbdruck" | "spardruck";
export type TourenplanOrientation = "landscape" | "portrait";
export type TourenplanPreviewResponse = z.infer<typeof api.tourPrintPreview.get.responses[200]>;
export type TourenplanPreviewAppointment = TourenplanPreviewResponse["appointments"][number];
export type TourenplanAppointmentListResponse = z.infer<typeof api.appointments.list.responses[200]>;
export type TourenplanAppointmentListItem = TourenplanAppointmentListResponse["items"][number];
export type TourenplanResolvedTagKind = "reklamation" | "sondermass" | "messe" | "neutral";

export type TourenplanResolvedAppointment = TourenplanPreviewAppointment & {
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
};

export type TourenplanWeekSection = {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  markerTopPx: number;
  appointments: TourenplanResolvedAppointment[];
};

export type TourenplanPrintPageData = {
  pageNumber: number;
  tourName: string;
  weeks: TourenplanWeekSection[];
};

type TourenplanTagPresentation = {
  kind: TourenplanResolvedTagKind;
  label: string | null;
  borderColor: string;
  headerBackground: string;
  headerTextColor: string;
  headerDividerColor: string;
  dateTextColor: string;
  pillBackground: string | null;
  pillTextColor: string | null;
};

const PAGE_CAPACITY_PX = 720;
const WEEK_GAP_PX = 10;
const CARD_BASE_HEIGHT_PX = 88;
const NOTE_TILE_HEIGHT_PX = 42;

function mergeUniqueTags(...collections: Array<readonly Tag[] | null | undefined>): Tag[] {
  const tagsById = new Map<number, Tag>();
  for (const collection of collections) {
    for (const tag of collection ?? []) {
      if (!tagsById.has(tag.id)) {
        tagsById.set(tag.id, tag);
      }
    }
  }
  return Array.from(tagsById.values());
}

export function resolveTourenplanTagKind(appointment: Pick<TourenplanPreviewAppointment, "appointmentTags" | "customerTags" | "projectTags">): TourenplanResolvedTagKind {
  const tags = mergeUniqueTags(appointment.appointmentTags, appointment.customerTags, appointment.projectTags);
  if (tags.some((tag) => isManagedReportExclusionTagName(tag.name))) {
    return "reklamation";
  }
  if (tags.some((tag) => isManagedSpecialMeasureTagName(tag.name))) {
    return "sondermass";
  }
  if (tags.some((tag) => isManagedMesseTagName(tag.name))) {
    return "messe";
  }
  return "neutral";
}

export function resolveTourenplanTagPresentation(
  appointment: Pick<TourenplanPreviewAppointment, "appointmentTags" | "customerTags" | "projectTags">,
  printMode: TourenplanPrintMode,
): TourenplanTagPresentation {
  const kind = resolveTourenplanTagKind(appointment);

  if (kind === "reklamation") {
    return printMode === "farbdruck"
      ? {
          kind,
          label: "Reklamation",
          borderColor: "#f97316",
          headerBackground: "#fed7aa",
          headerTextColor: "#7c2d12",
          headerDividerColor: "rgba(124,45,18,0.18)",
          dateTextColor: "#7c2d12",
          pillBackground: "#ffedd5",
          pillTextColor: "#9a3412",
        }
      : {
          kind,
          label: "Reklamation",
          borderColor: "#f97316",
          headerBackground: "#ffffff",
          headerTextColor: "#0f172a",
          headerDividerColor: "#e2e8f0",
          dateTextColor: "#c2410c",
          pillBackground: "#ffedd5",
          pillTextColor: "#9a3412",
        };
  }

  if (kind === "sondermass") {
    return printMode === "farbdruck"
      ? {
          kind,
          label: "Sondermaß",
          borderColor: "#3b5bc8",
          headerBackground: "#3b5bc8",
          headerTextColor: "#ffffff",
          headerDividerColor: "rgba(255,255,255,0.22)",
          dateTextColor: "#ffffff",
          pillBackground: "#dbeafe",
          pillTextColor: "#1e3a8a",
        }
      : {
          kind,
          label: "Sondermaß",
          borderColor: "#3b5bc8",
          headerBackground: "#ffffff",
          headerTextColor: "#0f172a",
          headerDividerColor: "#e2e8f0",
          dateTextColor: "#1e3a8a",
          pillBackground: "#dbeafe",
          pillTextColor: "#1e3a8a",
        };
  }

  if (kind === "messe") {
    return printMode === "farbdruck"
      ? {
          kind,
          label: "Messe Aufbau/Abbau",
          borderColor: "#4a7c3f",
          headerBackground: "#4a7c3f",
          headerTextColor: "#ffffff",
          headerDividerColor: "rgba(255,255,255,0.22)",
          dateTextColor: "#ffffff",
          pillBackground: "#dcfce7",
          pillTextColor: "#166534",
        }
      : {
          kind,
          label: "Messe Aufbau/Abbau",
          borderColor: "#4a7c3f",
          headerBackground: "#ffffff",
          headerTextColor: "#0f172a",
          headerDividerColor: "#e2e8f0",
          dateTextColor: "#3a6130",
          pillBackground: "#dcfce7",
          pillTextColor: "#166534",
        };
  }

  return {
    kind,
    label: null,
    borderColor: "#cbd5e1",
    headerBackground: printMode === "farbdruck" ? "#f1f5f9" : "#ffffff",
    headerTextColor: printMode === "farbdruck" ? "#334155" : "#0f172a",
    headerDividerColor: "#e2e8f0",
    dateTextColor: printMode === "farbdruck" ? "#334155" : "#0f172a",
    pillBackground: null,
    pillTextColor: null,
  };
}

export function formatTourenplanDate(value: string): string {
  return format(parseISO(value), "dd.MM.yy", { locale: de });
}

export function formatTourenplanHeaderDate(appointment: Pick<TourenplanResolvedAppointment, "startDate" | "durationDays" | "appointmentTags" | "customerTags" | "projectTags">): string {
  const prefix = formatTourenplanDate(appointment.startDate);
  return resolveTourenplanTagKind(appointment) === "reklamation"
    ? `${prefix} · Reklamation`
    : `${prefix} · ${appointment.durationDays} ${appointment.durationDays === 1 ? "Tag" : "Tage"}`;
}

export function formatTourenplanLocationLines(customer: Pick<TourenplanPreviewAppointment["customer"], "postalCode" | "city" | "country" | "phone">): string[] {
  const locality = [customer.postalCode, customer.city].filter(Boolean).join(" ").trim();
  const lines = [
    locality.length > 0 ? locality : null,
    customer.country ?? null,
    customer.phone?.trim() ? customer.phone.trim() : null,
  ].filter((value): value is string => Boolean(value && value.trim()));
  return lines;
}

export function formatTourenplanProjectDescription(value: string | null | undefined): string {
  const normalized = stripHtmlToText(value);
  return normalized.length > 0 ? normalized : "—";
}

export function formatTourenplanEmployeeBadges(employees: Array<{ fullName: string }>): string[] {
  return employees.map((employee) => formatEmployeeShortName(employee.fullName)).filter((value) => value.trim().length > 0);
}

function compareAppointments(left: TourenplanResolvedAppointment, right: TourenplanResolvedAppointment): number {
  const leftKind = resolveTourenplanTagKind(left);
  const rightKind = resolveTourenplanTagKind(right);
  if (left.startDate === right.startDate && leftKind !== rightKind) {
    if (leftKind === "reklamation") return 1;
    if (rightKind === "reklamation") return -1;
  }

  const leftDateTime = `${left.startDate}T${left.startTime ?? "00:00:00"}`;
  const rightDateTime = `${right.startDate}T${right.startTime ?? "00:00:00"}`;
  if (leftDateTime < rightDateTime) return -1;
  if (leftDateTime > rightDateTime) return 1;
  return left.id - right.id;
}

function estimateCardHeight(appointment: TourenplanResolvedAppointment): number {
  const notesHeight = appointment.printNotes.length > 0 ? NOTE_TILE_HEIGHT_PX : 0;
  const employeeHeight = Math.max(0, appointment.employees.length - 2) * 6;
  const articleHeight = Math.max(0, appointment.projectArticleItems.length - 2) * 6;
  return CARD_BASE_HEIGHT_PX + notesHeight + employeeHeight + articleHeight;
}

export function mergeTourenplanAppointments(
  previewData: TourenplanPreviewResponse,
  appointmentItems: TourenplanAppointmentListItem[],
): TourenplanResolvedAppointment[] {
  const detailsById = new Map<number, TourenplanAppointmentListItem>(appointmentItems.map((item) => [item.id, item]));

  return previewData.appointments.map((appointment) => {
    const detail = detailsById.get(appointment.id);
    return {
      ...appointment,
      customer: {
        ...appointment.customer,
        phone: appointment.customer.phone ?? detail?.customer.phone ?? null,
      },
      projectArticleItems: detail?.projectArticleItems ?? [],
      projectDescription: detail?.projectDescription ?? null,
    };
  });
}

export function buildTourenplanPrintPages(
  previewData: TourenplanPreviewResponse,
  appointmentItems: TourenplanAppointmentListItem[],
): TourenplanPrintPageData[] {
  const appointments = mergeTourenplanAppointments(previewData, appointmentItems);
  const appointmentsByWeekStart = new Map<string, TourenplanResolvedAppointment[]>();

  for (const week of previewData.weeks) {
    const weekAppointments = appointments
      .filter((appointment) => appointment.startDate >= week.weekStart && appointment.startDate <= week.weekEnd)
      .sort(compareAppointments);
    appointmentsByWeekStart.set(week.weekStart, weekAppointments);
  }

  const pages: TourenplanPrintPageData[] = [];
  let currentWeeks: TourenplanWeekSection[] = [];
  let usedCapacity = 0;
  let markerOffset = 4;

  const flushPage = () => {
    if (currentWeeks.length === 0) {
      return;
    }
    pages.push({
      pageNumber: pages.length + 1,
      tourName: previewData.tour.name,
      weeks: currentWeeks,
    });
    currentWeeks = [];
    usedCapacity = 0;
    markerOffset = 4;
  };

  for (const week of previewData.weeks) {
    const weekAppointments = appointmentsByWeekStart.get(week.weekStart) ?? [];
    if (weekAppointments.length === 0) {
      continue;
    }

    const weekHeight = weekAppointments.reduce((sum, appointment) => sum + estimateCardHeight(appointment) + 6, 0) + WEEK_GAP_PX;
    if (currentWeeks.length > 0 && usedCapacity + weekHeight > PAGE_CAPACITY_PX) {
      flushPage();
    }

    currentWeeks.push({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weekNumber: getISOWeek(parseISO(week.weekStart)),
      markerTopPx: markerOffset,
      appointments: weekAppointments,
    });
    usedCapacity += weekHeight;
    markerOffset += weekHeight;
  }

  flushPage();

  if (pages.length > 0) {
    return pages;
  }

  return [{
    pageNumber: 1,
    tourName: previewData.tour.name,
    weeks: [],
  }];
}
