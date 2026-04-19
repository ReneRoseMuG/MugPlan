import { useQuery } from "@tanstack/react-query";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

export type CalendarAppointment = {
  id: number;
  version: number;
  projectId: number | null;
  projectName: string;
  projectVersion: number | null;
  projectOrderNumber: string | null;
  projectArticleItems: ProjectArticleItem[];
  projectDescription: string | null;
  project?: {
    id: number;
    customerId: number;
    name: string;
    orderNumber: string | null;
    descriptionMd: string | null;
    isActive: boolean;
  } | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  tourId: number | null;
  tourName: string | null;
  tourColor: string | null;
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode: string | null;
    city: string | null;
    country?: string | null;
  };
  customerNotesCount: number;
  projectNotesCount: number;
  appointmentNotesCount: number;
  customerAttachmentsCount: number;
  projectAttachmentsCount: number;
  appointmentAttachmentsCount: number;
  totalAttachmentsCount: number;
  appointmentTags: Tag[];
  customerTags: Tag[];
  projectTags: Tag[];
  displayMode: "standard" | "compact" | "detail";
  employees: { id: number; fullName: string }[];
  isLocked: boolean;
  isCancelled: boolean;
};

export type CalendarWeekLaneEmployeePreview = {
  date: string;
  weekStartDate: string;
  tourId: number;
  weekEmployees: { id: number; fullName: string }[];
  additionalDayEmployees: { id: number; fullName: string }[];
};

export type CalendarBlockedTourWeek = {
  tourId: number;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isBlocked: boolean;
};

export type CalendarTourPostalPlanDayAppointment = {
  id: number;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  projectName: string | null;
  customerName: string | null;
  postalCode: string | null;
  displayMode: "standard" | "compact" | "detail";
  isCancelled: boolean;
};

export type CalendarTourPostalPlanDay = {
  date: string;
  appointments: CalendarTourPostalPlanDayAppointment[];
};

export type CalendarTourPostalPlanSuggestion = {
  tourId: number;
  tourName: string;
  tourColor: string | null;
  score: number;
  scoreLabel: "exakt" | "sehr nah" | "nah" | "grob passend" | "schwach passend";
  matchedPostalCodes: string[];
  matchedAppointmentCount: number;
  days: CalendarTourPostalPlanDay[];
  appointments: CalendarAppointment[];
};

export type CalendarTourPostalPlanWeek = {
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  suggestions: CalendarTourPostalPlanSuggestion[];
};

const logPrefix = "[calendar-appointments]";

export const getCalendarAppointmentsQueryKey = ({
  fromDate,
  toDate,
  employeeId,
  userRole,
}: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  userRole: string;
}) => ["calendarAppointments", fromDate, toDate, employeeId ?? "all", userRole];

export const getCalendarWeekLaneEmployeePreviewsQueryKey = ({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}) => ["calendarWeekLaneEmployeePreviews", fromDate, toDate];

export const getCalendarBlockedTourWeeksQueryKey = ({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}) => ["calendarBlockedTourWeeks", fromDate, toDate];

export const getCalendarTourPostalPlanQueryKey = ({
  postalCode,
  fromDate,
  toDate,
}: {
  postalCode: string;
  fromDate: string;
  toDate: string;
}) => ["calendarTourPostalPlan", postalCode, fromDate, toDate];

export function useCalendarAppointments({
  fromDate,
  toDate,
  employeeId,
  detail,
  userRole,
  enabled,
}: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  detail?: "compact" | "full";
  userRole: string;
  enabled?: boolean;
}) {
  const resolvedDetail = detail ?? "compact";
  return useQuery<CalendarAppointment[]>({
    queryKey: [...getCalendarAppointmentsQueryKey({ fromDate, toDate, employeeId, userRole }), resolvedDetail],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate, detail: resolvedDetail });
      if (employeeId) params.set("employeeId", String(employeeId));
      console.info(`${logPrefix} fetch`, { fromDate, toDate, detail: resolvedDetail, employeeId: employeeId ?? null });
      const response = await fetch(`/api/calendar/appointments?${params.toString()}`, {
        headers: {
        },
      });
      if (!response.ok) {
        throw new Error("Kalendertermine konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        return [];
      }
      const data = (payload as CalendarAppointment[]).map((rawAppointment) => {
        const customerNotesCount = Number.isFinite(rawAppointment.customerNotesCount)
          ? Math.max(0, rawAppointment.customerNotesCount)
          : 0;
        const projectNotesCount = Number.isFinite(rawAppointment.projectNotesCount)
          ? Math.max(0, rawAppointment.projectNotesCount)
          : 0;
        const appointmentNotesCount = Number.isFinite(rawAppointment.appointmentNotesCount)
          ? Math.max(0, rawAppointment.appointmentNotesCount)
          : 0;
        const customerAttachmentsCount = Number.isFinite(rawAppointment.customerAttachmentsCount)
          ? Math.max(0, rawAppointment.customerAttachmentsCount)
          : 0;
        const projectAttachmentsCount = Number.isFinite(rawAppointment.projectAttachmentsCount)
          ? Math.max(0, rawAppointment.projectAttachmentsCount)
          : 0;
        const appointmentAttachmentsCount = Number.isFinite(rawAppointment.appointmentAttachmentsCount)
          ? Math.max(0, rawAppointment.appointmentAttachmentsCount)
          : 0;
        const totalAttachmentsCount = Number.isFinite(rawAppointment.totalAttachmentsCount)
          ? Math.max(0, rawAppointment.totalAttachmentsCount)
          : customerAttachmentsCount + projectAttachmentsCount + appointmentAttachmentsCount;

        return {
          ...rawAppointment,
          customerNotesCount,
          projectNotesCount,
          appointmentNotesCount,
          customerAttachmentsCount,
          projectAttachmentsCount,
          appointmentAttachmentsCount,
          totalAttachmentsCount,
          appointmentTags: Array.isArray(rawAppointment.appointmentTags) ? rawAppointment.appointmentTags : [],
          customerTags: Array.isArray(rawAppointment.customerTags) ? rawAppointment.customerTags : [],
          projectTags: Array.isArray(rawAppointment.projectTags) ? rawAppointment.projectTags : [],
        };
      });
      console.info(`${logPrefix} fetch success`, { count: data.length });
      return data;
    },
  });
}

export function useCalendarWeekLaneEmployeePreviews({
  fromDate,
  toDate,
  enabled,
}: {
  fromDate: string;
  toDate: string;
  enabled?: boolean;
}) {
  return useQuery<CalendarWeekLaneEmployeePreview[]>({
    queryKey: getCalendarWeekLaneEmployeePreviewsQueryKey({ fromDate, toDate }),
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      const response = await fetch(`/api/calendar/week-lane-employee-previews?${params.toString()}`, {
        headers: {},
      });
      if (!response.ok) {
        throw new Error("Kalender-Lane-Previews konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? payload as CalendarWeekLaneEmployeePreview[] : [];
    },
  });
}

export function useCalendarBlockedTourWeeks({
  fromDate,
  toDate,
  enabled,
}: {
  fromDate: string;
  toDate: string;
  enabled?: boolean;
}) {
  return useQuery<CalendarBlockedTourWeek[]>({
    queryKey: getCalendarBlockedTourWeeksQueryKey({ fromDate, toDate }),
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      const response = await fetch(`/api/calendar/blocked-tour-weeks?${params.toString()}`, {
        headers: {},
      });
      if (!response.ok) {
        throw new Error("Blockierte Kalenderwochen konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? payload as CalendarBlockedTourWeek[] : [];
    },
  });
}

export function useCalendarTourPostalPlan({
  postalCode,
  fromDate,
  toDate,
  enabled,
}: {
  postalCode: string;
  fromDate: string;
  toDate: string;
  enabled?: boolean;
}) {
  return useQuery<CalendarTourPostalPlanWeek[]>({
    queryKey: getCalendarTourPostalPlanQueryKey({ postalCode, fromDate, toDate }),
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ postalCode, fromDate, toDate });
      const response = await fetch(`/api/calendar/tour-postal-plan?${params.toString()}`, {
        headers: {},
      });
      if (!response.ok) {
        throw new Error("PLZ-Plan-Vorschlaege konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? payload as CalendarTourPostalPlanWeek[] : [];
    },
  });
}
