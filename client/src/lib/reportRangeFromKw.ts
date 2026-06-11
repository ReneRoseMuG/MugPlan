import { addWeeks, endOfISOWeek, format } from "date-fns";

import { normalizeIsoWeekNumber } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";

/** Maximale Anzahl Wochen für einen KW-Reportzeitraum (ein volles 53-Wochen-Jahr). */
export const MAX_REPORT_WEEK_COUNT = 53;

export function normalizeWeekCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1;
  return Math.max(1, Math.min(MAX_REPORT_WEEK_COUNT, value));
}

export function normalizeKwStart(value: number | undefined): number | undefined {
  return normalizeIsoWeekNumber(value);
}

export function resolveReportRangeFromKw(params: {
  kwStart: number | undefined;
  weekCount: number | undefined;
  isoWeekYear: number;
}): { fromDate: string; toDate: string } | null {
  const normalizedKwStart = normalizeKwStart(params.kwStart);
  if (!normalizedKwStart) return null;

  const startDate = resolveKwJumpTarget(params.isoWeekYear, normalizedKwStart);
  if (!startDate) return null;

  const weekCount = normalizeWeekCount(params.weekCount);
  const endDate = endOfISOWeek(addWeeks(startDate, weekCount - 1));
  return {
    fromDate: format(startDate, "yyyy-MM-dd"),
    toDate: format(endDate, "yyyy-MM-dd"),
  };
}
