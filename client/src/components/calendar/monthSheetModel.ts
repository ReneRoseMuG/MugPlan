import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
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
  visibleStart: Date;
  visibleEnd: Date;
  weeks: MonthSheetWeek[];
};

export function buildMonthSheetMatrix(year: number, month: number): MonthSheetMatrix {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const visibleStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: de });
  const visibleEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: de });

  const weeks: MonthSheetWeek[] = [];
  let weekStart = visibleStart;

  while (weekStart <= visibleEnd) {
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const day = addDays(weekStart, dayIndex);
      return {
        date: day,
        dateKey: format(day, "yyyy-MM-dd"),
        isCurrentMonth: isSameMonth(day, monthStart),
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

  return {
    year: monthStart.getFullYear(),
    month: monthStart.getMonth() + 1,
    monthStart,
    monthEnd,
    monthKey: format(monthStart, "yyyy-MM-dd"),
    visibleStart,
    visibleEnd,
    weeks,
  };
}

export function buildFixedWeekMatrix(fromMonday: Date, weekCount: number): MonthSheetMatrix {
  const weeks: MonthSheetWeek[] = [];

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const weekStart = addDays(fromMonday, weekIndex * 7);
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const day = addDays(weekStart, dayIndex);
      return {
        date: day,
        dateKey: format(day, "yyyy-MM-dd"),
        isCurrentMonth: true,
        isToday: isToday(day),
      };
    });
    weeks.push({
      weekStart,
      weekEnd: days[6].date,
      weekNumber: getISOWeek(weekStart),
      days,
    });
  }

  const lastWeekEnd = weeks[weeks.length - 1]?.weekEnd ?? fromMonday;

  return {
    year: fromMonday.getFullYear(),
    month: fromMonday.getMonth() + 1,
    monthStart: fromMonday,
    monthEnd: lastWeekEnd,
    monthKey: format(fromMonday, "yyyy-MM-dd"),
    visibleStart: fromMonday,
    visibleEnd: lastWeekEnd,
    weeks,
  };
}
