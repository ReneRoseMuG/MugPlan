import { getISOWeeksInYear, setISOWeek, startOfISOWeek } from "date-fns";

export function resolveKwJumpTarget(kw: number, referenceDate: Date): Date | null {
  if (!Number.isInteger(kw) || kw < 1 || kw > 53 || Number.isNaN(referenceDate.getTime())) {
    return null;
  }

  const isoWeekCount = getISOWeeksInYear(referenceDate);
  if (kw > isoWeekCount) {
    return null;
  }

  return startOfISOWeek(setISOWeek(startOfISOWeek(referenceDate), kw));
}
