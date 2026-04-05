import { addWeeks, endOfISOWeek, format } from "date-fns";

import { resolveKwJumpTarget } from "@/lib/kwJump";

export function normalizeWeekCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return 1;
  return Math.max(1, Math.min(52, value));
}

export function normalizeKwStart(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1) return undefined;
  return Math.min(53, value);
}

export function resolveReportRangeFromKw(params: {
  kwStart: number | undefined;
  weekCount: number | undefined;
  referenceDate: Date;
}): { fromDate: string; toDate: string } | null {
  const normalizedKwStart = normalizeKwStart(params.kwStart);
  if (!normalizedKwStart) return null;

  const startDate = resolveKwJumpTarget(normalizedKwStart, params.referenceDate);
  if (!startDate) return null;

  const weekCount = normalizeWeekCount(params.weekCount);
  const endDate = endOfISOWeek(addWeeks(startDate, weekCount - 1));
  return {
    fromDate: format(startDate, "yyyy-MM-dd"),
    toDate: format(endDate, "yyyy-MM-dd"),
  };
}
