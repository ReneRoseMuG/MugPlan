import { getISOWeeksInYear, setISOWeek, startOfISOWeek } from "date-fns";

import { parseIsoWeekNumber } from "@/lib/isoWeekInput";

export function resolveKwJumpTarget(kw: number, referenceDate: Date): Date | null {
  const normalizedKw = parseIsoWeekNumber(kw);
  if (!normalizedKw || Number.isNaN(referenceDate.getTime())) {
    return null;
  }

  const isoWeekCount = getISOWeeksInYear(referenceDate);
  if (normalizedKw > isoWeekCount) {
    return null;
  }

  return startOfISOWeek(setISOWeek(startOfISOWeek(referenceDate), normalizedKw));
}
