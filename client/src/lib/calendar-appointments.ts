import { useQuery } from "@tanstack/react-query";

export type CalendarAppointment = {
  id: number;
  projectId: number;
  projectName: string;
  projectDescription: string | null;
  projectStatuses: { id: number; title: string; color: string }[];
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
  userRole,
}: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  userRole: string;
}) {
  return useQuery<CalendarAppointment[]>({
    queryKey: getCalendarAppointmentsQueryKey({ fromDate, toDate, employeeId, userRole }),
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      if (employeeId) params.set("employeeId", String(employeeId));
      console.info(`${logPrefix} fetch`, { fromDate, toDate, employeeId: employeeId ?? null });
      const response = await fetch(`/api/calendar/appointments?${params.toString()}`, {
        headers: {
          "x-user-role": userRole,
        },
      });
      if (!response.ok) {
        throw new Error("Kalendertermine konnten nicht geladen werden");
      }
      const data = (await response.json()) as CalendarAppointment[];
      console.info(`${logPrefix} fetch success`, { count: data.length });
      return data;
    },
  });
}
