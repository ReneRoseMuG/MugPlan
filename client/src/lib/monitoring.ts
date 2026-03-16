import { api, type MonitoringListResponse } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import type { useToast } from "@/hooks/use-toast";

type ToastFn = ReturnType<typeof useToast>["toast"];

function canAccessMonitoring(): boolean {
  const role = window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER";
  return role === "ADMIN" || role === "DISPATCHER" || role === "DISPONENT";
}

function buildTriggerSet(items: MonitoringListResponse | undefined): Set<string> {
  return new Set((items ?? []).map((item) => item.triggerName));
}

function shouldNotify(previousItems: MonitoringListResponse | undefined, nextItems: MonitoringListResponse): boolean {
  const previousCount = previousItems?.length ?? 0;
  if (nextItems.length > previousCount) {
    return true;
  }

  const previousTriggerNames = buildTriggerSet(previousItems);
  for (const triggerName of Array.from(buildTriggerSet(nextItems))) {
    if (!previousTriggerNames.has(triggerName)) {
      return true;
    }
  }

  return false;
}

export async function invalidateMonitoringQueries(): Promise<void> {
  if (!canAccessMonitoring()) return;
  await queryClient.invalidateQueries({ queryKey: [api.monitoring.list.path] });
}

export async function refreshMonitoringWithNotification(toast: ToastFn): Promise<void> {
  if (!canAccessMonitoring()) return;

  const previousItems = queryClient.getQueryData<MonitoringListResponse>([api.monitoring.list.path]);
  await invalidateMonitoringQueries();
  const nextItems = await queryClient.fetchQuery<MonitoringListResponse>({
    queryKey: [api.monitoring.list.path],
    queryFn: async () => {
      const response = await fetch(api.monitoring.list.path, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Monitoring konnte nicht geladen werden");
      }
      return (await response.json()) as MonitoringListResponse;
    },
    staleTime: 0,
  });

  if (!shouldNotify(previousItems, nextItems) || nextItems.length === 0) {
    return;
  }

  const triggerNames = Array.from(new Set(nextItems.map((item) => item.triggerName)));
  toast({
    title: `${nextItems.length} problematische Termine im Monitoring`,
    description: triggerNames.join(", "),
  });
}
