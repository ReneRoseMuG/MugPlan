import { queryClient } from "@/lib/queryClient";

export async function invalidateTagProjectionQueries(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["calendarAppointments"],
  });
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return firstKey === "appointments-list"
        || firstKey === "/api/customers/list"
        || firstKey === "/api/projects/list"
        || firstKey === "customers-page-appointments"
        || firstKey === "employees-page-appointments"
        || firstKey === "projects-page-appointments"
        || firstKey === "customerAppointments"
        || firstKey === "entityAppointments"
        || firstKey === "projectAppointments"
        || firstKey === "tourPrintPreview"
        || firstKey === "tour-management-appointments-count"
        || firstKey === "/api/entity-appointments-preview";
    },
  });
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return typeof firstKey === "string" && firstKey.includes("/current-appointments?");
    },
  });
}
