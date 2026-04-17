import type { QueryClient } from "@tanstack/react-query";

type TourWeekQueryScope = {
  tourId: number;
  isoYear: number;
  isoWeek: number;
  employeeId?: number | null;
};

export async function invalidateTourWeekQueries(
  client: QueryClient,
  { tourId, isoYear, isoWeek, employeeId = null }: TourWeekQueryScope,
): Promise<void> {
  await client.invalidateQueries({
    queryKey: ["calendarWeekNotes", isoYear, isoWeek, tourId],
  });
  await client.invalidateQueries({
    queryKey: ["/api/notes-preview"],
  });
  await client.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      if (firstKey === "appointments-list") return true;
      if (firstKey === "/api/appointments/list") return true;
      if (firstKey === "calendarAppointments") return true;
      if (firstKey === "calendarWeekLaneEmployeePreviews") return true;
      if (firstKey === "calendarBlockedTourWeeks") return true;
      if (firstKey === "/api/calendar/appointments") return true;
      if (firstKey === "tour-management-appointments-count") return true;
      if (Array.isArray(query.queryKey) && query.queryKey[0] === "/api/employees") return true;

      return typeof firstKey === "string"
        && (
          firstKey.startsWith(`/api/tours/${tourId}/week-employees`)
          || (employeeId != null && firstKey === `/api/employees/${employeeId}/week-plans`)
        );
    },
  });
  await client.invalidateQueries({
    queryKey: ["/api/tours"],
  });
  if (employeeId != null) {
    await client.invalidateQueries({
      queryKey: ["/api/employees", employeeId],
    });
  }
}
