import { queryClient } from "@/lib/queryClient";

function isAppointmentAttachmentContextQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === "/api/appointments" && queryKey[2] === "attachment-context";
}

export async function invalidateAttachmentProjectionQueries(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ["calendarAppointments"],
  });
  await queryClient.invalidateQueries({
    predicate: (query) => (
      Array.isArray(query.queryKey) && isAppointmentAttachmentContextQueryKey(query.queryKey)
    ),
  });
}
