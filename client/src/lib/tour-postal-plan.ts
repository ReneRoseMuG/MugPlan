import { addDays, addWeeks, endOfWeek, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

export function normalizeTourPostalPlanPostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function normalizeTourPostalPlanWeekInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

export function resolveTourPostalPlanWeekStart(isoYear: number, isoWeek: number): Date {
  const firstIsoWeekStart = startOfISOWeek(new Date(isoYear, 0, 4));
  return addWeeks(firstIsoWeekStart, isoWeek - 1);
}

export function resolveTourPostalPlanMinimumWeekStartDate(todayDate: string): Date {
  return addWeeks(startOfISOWeek(parseISO(todayDate)), 1);
}

export function resolveTourPostalPlanMaxWeekStartDate(maxWeekInput: string, todayDate: string): Date | null {
  const normalized = normalizeTourPostalPlanWeekInput(maxWeekInput);
  if (normalized.length === 0) return null;

  const isoWeek = Number(normalized);
  if (!Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    return null;
  }

  const today = parseISO(todayDate);
  const currentIsoWeek = getISOWeek(today);
  const currentIsoYear = getISOWeekYear(today);
  const targetIsoYear = isoWeek < currentIsoWeek ? currentIsoYear + 1 : currentIsoYear;
  return resolveTourPostalPlanWeekStart(targetIsoYear, isoWeek);
}

export function buildTourPostalPlanWindow(params: {
  currentWeekStart: Date;
  visibleWeekCount: number;
  maxWeekStartDate: Date | null;
}) {
  const { currentWeekStart, visibleWeekCount, maxWeekStartDate } = params;
  const fullWindowEndDate = addDays(addWeeks(currentWeekStart, visibleWeekCount), -1);
  const maxWindowEndDate = maxWeekStartDate
    ? endOfWeek(maxWeekStartDate, { weekStartsOn: 1 })
    : null;
  const resolvedWindowEndDate =
    maxWindowEndDate && maxWindowEndDate < fullWindowEndDate
      ? maxWindowEndDate
      : fullWindowEndDate;

  return {
    fromDate: currentWeekStart,
    toDate: resolvedWindowEndDate,
  };
}
