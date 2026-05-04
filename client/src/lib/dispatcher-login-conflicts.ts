import { addWeeks, endOfISOWeek, isWithinInterval, parseISO, startOfISOWeek } from "date-fns";
import type { MonitoringListResponse } from "@shared/routes";

export type DispatcherLoginConflicts = {
  withoutEmployees: MonitoringListResponse;
  parked: MonitoringListResponse;
};

export function buildDispatcherLoginConflicts(
  items: MonitoringListResponse | undefined,
  today: Date = new Date(),
): DispatcherLoginConflicts {
  const interval = {
    start: startOfISOWeek(today),
    end: endOfISOWeek(addWeeks(today, 2)),
  };

  const rows = items ?? [];
  return {
    withoutEmployees: rows.filter((item) => (
      item.triggerCodes.includes("TR-01")
      && isWithinInterval(parseISO(item.startDate), interval)
    )),
    parked: rows.filter((item) => item.triggerCodes.includes("TR-02")),
  };
}

export function hasDispatcherLoginConflicts(conflicts: DispatcherLoginConflicts): boolean {
  return conflicts.withoutEmployees.length > 0 || conflicts.parked.length > 0;
}
