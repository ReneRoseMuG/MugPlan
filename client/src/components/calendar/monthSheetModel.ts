import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfISOWeek,
  startOfWeek,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";

export type MonthSheetDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type MonthSheetWeek = {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  days: MonthSheetDay[];
};

export type MonthSheetMatrix = {
  year: number;
  month: number;
  monthStart: Date;
  monthEnd: Date;
  monthKey: string;
  isWindow: boolean;
  visibleStart: Date;
  visibleEnd: Date;
  weeks: MonthSheetWeek[];
};

export const MONTH_SHEET_WINDOW_WEEK_COUNT = 6;

export function normalizeMonthWindowStart(value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    return startOfISOWeek(new Date());
  }
  return startOfISOWeek(value);
}

function buildWeeks(params: {
  visibleStart: Date;
  visibleEnd: Date;
  currentMonthStart: Date | null;
}): MonthSheetWeek[] {
  const weeks: MonthSheetWeek[] = [];
  let weekStart = params.visibleStart;

  while (weekStart <= params.visibleEnd) {
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const day = addDays(weekStart, dayIndex);
      return {
        date: day,
        dateKey: format(day, "yyyy-MM-dd"),
        isCurrentMonth: params.currentMonthStart === null ? true : isSameMonth(day, params.currentMonthStart),
        isToday: isToday(day),
      };
    });

    weeks.push({
      weekStart,
      weekEnd: days[6].date,
      weekNumber: getISOWeek(weekStart),
      days,
    });

    weekStart = addDays(weekStart, 7);
  }

  return weeks;
}

export function buildMonthSheetMatrix(year: number, month: number): MonthSheetMatrix {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const visibleStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: de });
  const visibleEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: de });
  const weeks = buildWeeks({ visibleStart, visibleEnd, currentMonthStart: monthStart });

  return {
    year: monthStart.getFullYear(),
    month: monthStart.getMonth() + 1,
    monthStart,
    monthEnd,
    monthKey: format(monthStart, "yyyy-MM-dd"),
    isWindow: false,
    visibleStart,
    visibleEnd,
    weeks,
  };
}

export function buildFixedWeekMatrix(fromMonday: Date, weekCount: number): MonthSheetMatrix {
  const visibleStart = normalizeMonthWindowStart(fromMonday);
  const visibleEnd = addDays(visibleStart, Math.max(1, weekCount) * 7 - 1);
  const weeks = buildWeeks({ visibleStart, visibleEnd, currentMonthStart: null });

  return {
    year: visibleStart.getFullYear(),
    month: visibleStart.getMonth() + 1,
    monthStart: visibleStart,
    monthEnd: visibleEnd,
    monthKey: format(visibleStart, "yyyy-MM-dd"),
    isWindow: true,
    visibleStart,
    visibleEnd,
    weeks,
  };
}

export function buildMonthWindowMatrix(
  windowStart: Date,
  weekCount = MONTH_SHEET_WINDOW_WEEK_COUNT,
): MonthSheetMatrix {
  return buildFixedWeekMatrix(normalizeMonthWindowStart(windowStart), weekCount);
}

export function parseMonthWindowStart(value: string | null | undefined, fallbackDate: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return normalizeMonthWindowStart(fallbackDate);
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? normalizeMonthWindowStart(fallbackDate)
    : normalizeMonthWindowStart(parsed);
}

export function getMonthWindowStartForMonthStart(value: Date): Date {
  return normalizeMonthWindowStart(startOfMonth(value));
}

export function getNextMonthWindowStart(windowStart: Date): Date {
  const displayedMonthStart = startOfMonth(addDays(normalizeMonthWindowStart(windowStart), 6));
  return getMonthWindowStartForMonthStart(addMonths(displayedMonthStart, 1));
}

export function getPreviousMonthWindowStart(windowStart: Date): Date {
  const displayedMonthStart = startOfMonth(addDays(normalizeMonthWindowStart(windowStart), 6));
  return getMonthWindowStartForMonthStart(subMonths(displayedMonthStart, 1));
}
