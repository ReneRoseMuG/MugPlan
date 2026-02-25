import { useQuery } from "@tanstack/react-query";

export type CalendarAppointment = {
  id: number;
  version: number;
  projectId: number;
  projectName: string;
  projectOrderNumber: string | null;
  projectDescription: string | null;
  projectStatuses: { id: number; title: string; color: string }[];
  project?: {
    id: number;
    customerId: number;
    name: string;
    orderNumber: string | null;
    descriptionMd: string | null;
    isActive: boolean;
  };
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  tourId: number | null;
  tourName: string | null;
  tourColor: string | null;
  customer: {
    id: number;
    customerNumber: string;
    fullName: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode: string | null;
    city: string | null;
  };
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
}: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  detail?: "compact" | "full";
  userRole: string;
}) {
  const resolvedDetail = detail ?? "compact";
  return useQuery<CalendarAppointment[]>({
    queryKey: [...getCalendarAppointmentsQueryKey({ fromDate, toDate, employeeId, userRole }), resolvedDetail],
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
      const data = payload as CalendarAppointment[];
      console.info(`${logPrefix} fetch success`, { count: data.length });
      return data;
    },
  });
}
