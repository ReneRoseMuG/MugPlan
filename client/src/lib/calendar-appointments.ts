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
  };
  customerNotesCount: number;
  projectNotesCount: number;
  appointmentNotesCount: number;
  appointmentTags: Tag[];
  customerTags: Tag[];
  projectTags: Tag[];
  displayMode: "standard" | "compact" | "detail";
  employees: { id: number; fullName: string }[];
  isLocked: boolean;
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

        return {
          ...rawAppointment,
          customerNotesCount,
          projectNotesCount,
          appointmentNotesCount,
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
