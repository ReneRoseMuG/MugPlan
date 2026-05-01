import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarMarker, CalendarMarkerUpdateInput, CalendarMarkerWriteInput } from "@shared/routes";

export type { CalendarMarker, CalendarMarkerUpdateInput, CalendarMarkerWriteInput } from "@shared/routes";

export const getCalendarMarkersQueryKey = ({
  fromDate,
  toDate,
  userRole,
}: {
  fromDate: string;
  toDate: string;
  userRole: string;
}) => ["calendarMarkers", fromDate, toDate, userRole];

const adminCalendarMarkersQueryKey = ["adminCalendarMarkers"];

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { code?: string } | null;
    throw new Error(payload?.code ?? fallbackMessage);
  }
  return await response.json() as T;
}

export function useCalendarMarkers({
  fromDate,
  toDate,
  userRole,
  enabled,
}: {
  fromDate: string;
  toDate: string;
  userRole: string;
  enabled?: boolean;
}) {
  return useQuery<CalendarMarker[]>({
    queryKey: getCalendarMarkersQueryKey({ fromDate, toDate, userRole }),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      const response = await fetch(`/api/calendar/markers?${params.toString()}`);
      return readJsonResponse<CalendarMarker[]>(response, "Kalendermarker konnten nicht geladen werden");
    },
  });
}

export function useAdminCalendarMarkers() {
  return useQuery<CalendarMarker[]>({
    queryKey: adminCalendarMarkersQueryKey,
    queryFn: async () => {
      const response = await fetch("/api/admin/calendar-markers");
      return readJsonResponse<CalendarMarker[]>(response, "Kalendermarker konnten nicht geladen werden");
    },
  });
}

export function useCreateCalendarMarker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CalendarMarkerWriteInput) => {
      const response = await fetch("/api/admin/calendar-markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readJsonResponse<CalendarMarker>(response, "Kalendermarker konnte nicht angelegt werden");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCalendarMarkersQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["calendarMarkers"] });
    },
  });
}

export function useUpdateCalendarMarker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CalendarMarkerUpdateInput }) => {
      const response = await fetch(`/api/admin/calendar-markers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readJsonResponse<CalendarMarker>(response, "Kalendermarker konnte nicht gespeichert werden");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCalendarMarkersQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["calendarMarkers"] });
    },
  });
}

export function useDeleteCalendarMarker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, version }: { id: string; version: number }) => {
      const response = await fetch(`/api/admin/calendar-markers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { code?: string } | null;
        throw new Error(payload?.code ?? "Kalendermarker konnte nicht gelöscht werden");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCalendarMarkersQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["calendarMarkers"] });
    },
  });
}
