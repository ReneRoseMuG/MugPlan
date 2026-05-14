import {
  addWeeks,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  isWithinInterval,
  isValid,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import type { MonitoringListResponse } from "@shared/routes";

export const DEFAULT_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS = 2;
export const MIN_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS = 0;
export const MAX_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS = 12;

export type DispatcherLoginWeekUrgency = "past" | "current" | "next" | "near" | "future";

export type DispatcherLoginConflictWeekGroup = {
  key: string;
  isoYear: number;
  isoWeek: number;
  weekStart: string;
  weekEnd: string;
  label: string;
  dateRangeLabel: string;
  distanceWeeks: number;
  urgency: DispatcherLoginWeekUrgency;
  items: MonitoringListResponse;
};

export type DispatcherLoginConflictRange = {
  lookaheadWeeks: number;
  fromDate: string;
  toDate: string;
  label: string;
  dateRangeLabel: string;
};

export type DispatcherLoginConflicts = {
  withoutEmployees: MonitoringListResponse;
  parked: MonitoringListResponse;
  withoutEmployeesWeeks: DispatcherLoginConflictWeekGroup[];
  parkedWeeks: DispatcherLoginConflictWeekGroup[];
  withoutEmployeesRange: DispatcherLoginConflictRange;
};

function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayDate(date: Date): string {
  return format(date, "dd.MM.yy");
}

function compareMonitoringItems(left: MonitoringListResponse[number], right: MonitoringListResponse[number]): number {
  const leftKey = `${left.startDate}|${left.startTime ?? ""}|${String(left.appointmentId).padStart(12, "0")}`;
  const rightKey = `${right.startDate}|${right.startTime ?? ""}|${String(right.appointmentId).padStart(12, "0")}`;
  return leftKey.localeCompare(rightKey, "de");
}

function resolveWeekUrgency(distanceWeeks: number): DispatcherLoginWeekUrgency {
  if (distanceWeeks < 0) return "past";
  if (distanceWeeks === 0) return "current";
  if (distanceWeeks === 1) return "next";
  if (distanceWeeks === 2) return "near";
  return "future";
}

export function normalizeDispatcherLoginConflictLookaheadWeeks(value: unknown): number {
  if (
    typeof value === "number"
    && Number.isInteger(value)
    && value >= MIN_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS
    && value <= MAX_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS
  ) {
    return value;
  }
  return DEFAULT_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS;
}

export function buildDispatcherLoginConflictRange(
  today: Date = new Date(),
  lookaheadWeeksInput: unknown = DEFAULT_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS,
): DispatcherLoginConflictRange {
  const lookaheadWeeks = normalizeDispatcherLoginConflictLookaheadWeeks(lookaheadWeeksInput);
  const start = startOfISOWeek(today);
  const end = endOfISOWeek(addWeeks(today, lookaheadWeeks));
  const fromDate = formatDateKey(start);
  const toDate = formatDateKey(end);
  const weekCount = lookaheadWeeks + 1;

  return {
    lookaheadWeeks,
    fromDate,
    toDate,
    label: lookaheadWeeks === 0
      ? "Diese KW"
      : `Diese KW + ${lookaheadWeeks} weitere ${lookaheadWeeks === 1 ? "KW" : "KWs"}`,
    dateRangeLabel: `${formatDisplayDate(start)} - ${formatDisplayDate(end)} (${weekCount} ${weekCount === 1 ? "KW" : "KWs"})`,
  };
}

export function groupMonitoringItemsByIsoWeek(
  items: MonitoringListResponse,
  today: Date = new Date(),
): DispatcherLoginConflictWeekGroup[] {
  const currentWeekStart = startOfISOWeek(today);
  const grouped = new Map<string, {
    isoYear: number;
    isoWeek: number;
    weekStartDate: Date;
    weekEndDate: Date;
    items: MonitoringListResponse;
  }>();

  for (const item of [...items].sort(compareMonitoringItems)) {
    const parsedDate = parseISO(item.startDate);
    if (!isValid(parsedDate)) {
      continue;
    }
    const weekStartDate = startOfISOWeek(parsedDate);
    const weekEndDate = endOfISOWeek(parsedDate);
    const isoYear = getISOWeekYear(parsedDate);
    const isoWeek = getISOWeek(parsedDate);
    const key = `${isoYear}-${String(isoWeek).padStart(2, "0")}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    grouped.set(key, {
      isoYear,
      isoWeek,
      weekStartDate,
      weekEndDate,
      items: [item],
    });
  }

  return Array.from(grouped.entries())
    .sort(([, left], [, right]) => left.weekStartDate.getTime() - right.weekStartDate.getTime())
    .map(([key, group]) => {
      const distanceWeeks = Math.round((group.weekStartDate.getTime() - currentWeekStart.getTime()) / 604800000);
      return {
        key,
        isoYear: group.isoYear,
        isoWeek: group.isoWeek,
        weekStart: formatDateKey(group.weekStartDate),
        weekEnd: formatDateKey(group.weekEndDate),
        label: `KW ${String(group.isoWeek).padStart(2, "0")} / ${group.isoYear}`,
        dateRangeLabel: `${formatDisplayDate(group.weekStartDate)} - ${formatDisplayDate(group.weekEndDate)}`,
        distanceWeeks,
        urgency: resolveWeekUrgency(distanceWeeks),
        items: group.items,
      };
    });
}

export function buildDispatcherLoginConflicts(
  items: MonitoringListResponse | undefined,
  today: Date = new Date(),
  lookaheadWeeksInput: unknown = DEFAULT_DISPATCHER_LOGIN_CONFLICT_LOOKAHEAD_WEEKS,
): DispatcherLoginConflicts {
  const withoutEmployeesRange = buildDispatcherLoginConflictRange(today, lookaheadWeeksInput);
  const interval = {
    start: parseISO(withoutEmployeesRange.fromDate),
    end: endOfISOWeek(parseISO(withoutEmployeesRange.toDate)),
  };

  const rows = items ?? [];
  const withoutEmployees = rows.filter((item) => (
    item.triggerCodes.includes("TR-01")
    && isWithinInterval(parseISO(item.startDate), interval)
  ));
  const parked = rows.filter((item) => item.triggerCodes.includes("TR-02"));

  return {
    withoutEmployees,
    parked,
    withoutEmployeesWeeks: groupMonitoringItemsByIsoWeek(withoutEmployees, today),
    parkedWeeks: groupMonitoringItemsByIsoWeek(parked, today),
    withoutEmployeesRange,
  };
}

export function hasDispatcherLoginConflicts(conflicts: DispatcherLoginConflicts): boolean {
  return conflicts.withoutEmployees.length > 0 || conflicts.parked.length > 0;
}
