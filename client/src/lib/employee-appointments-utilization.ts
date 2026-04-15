import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  format,
  getISOWeek,
  getISOWeekYear,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfISOWeek,
  type Locale,
} from "date-fns";
import { de } from "date-fns/locale";
import type { CalendarAppointment } from "./calendar-appointments";
import { getAppointmentEndDate } from "./calendar-utils";

export const EMPLOYEE_APPOINTMENTS_UTILIZATION_VISIBLE_WEEK_COUNT = 6;

export type EmployeeAppointmentsUtilizationSegment = {
  appointmentId: number;
  date: string;
  label: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  tourColor: string | null;
  isAllDay: boolean;
  isContinuation: boolean;
  appointment: CalendarAppointment;
};

export type EmployeeAppointmentsUtilizationDay = {
  date: string;
  weekdayLabel: string;
  dateLabel: string;
  appointmentCount: number;
  segments: EmployeeAppointmentsUtilizationSegment[];
};

export type EmployeeAppointmentsUtilizationWeek = {
  weekStartDate: string;
  weekEndDate: string;
  isoYear: number;
  isoWeek: number;
  title: string;
  monthGroupKey: string;
  monthLabel: string;
  days: EmployeeAppointmentsUtilizationDay[];
};

export type EmployeeAppointmentsUtilizationMonthGroup = {
  key: string;
  label: string;
  weeks: EmployeeAppointmentsUtilizationWeek[];
};

export type EmployeeAppointmentsUtilizationWindow = {
  fromDate: string;
  toDate: string;
  weeks: Array<{
    weekStartDate: string;
    weekEndDate: string;
    isoYear: number;
    isoWeek: number;
  }>;
};

export type EmployeeAppointmentsUtilizationBoardModel = {
  fromDate: string;
  toDate: string;
  weeks: EmployeeAppointmentsUtilizationWeek[];
  monthGroups: EmployeeAppointmentsUtilizationMonthGroup[];
  totalAppointmentCount: number;
};

function toDateOnlyString(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function capitalizeLeadingCharacter(value: string): string {
  if (value.length === 0) return value;
  return value.slice(0, 1).toLocaleUpperCase("de") + value.slice(1);
}

function formatWeekdayLabel(value: Date, locale: Locale): string {
  return capitalizeLeadingCharacter(format(value, "EEEEEE", { locale }));
}

function formatMonthLabel(value: Date, locale: Locale): string {
  return capitalizeLeadingCharacter(format(value, "LLLL yyyy", { locale }));
}

function formatPrimaryAppointmentLabel(appointment: CalendarAppointment): string {
  const projectName = appointment.projectName.trim();
  if (appointment.projectId && projectName.length > 0 && projectName !== "Ohne Projekt") {
    return projectName;
  }

  const customerFullName = appointment.customer.fullName?.trim();
  if (customerFullName) return customerFullName;
  return appointment.customer.customerNumber;
}

function formatSegmentLabel(appointment: CalendarAppointment, isContinuation: boolean): string {
  if (isContinuation) return "Fortsetzung";
  if (!appointment.startTime) return "Ganztägig";
  return appointment.startTime.slice(0, 5);
}

function compareSegments(
  left: EmployeeAppointmentsUtilizationSegment,
  right: EmployeeAppointmentsUtilizationSegment,
): number {
  if (left.isAllDay !== right.isAllDay) {
    return left.isAllDay ? -1 : 1;
  }

  const leftTime = left.startTime ? left.startTime.slice(0, 5) : "00:00";
  const rightTime = right.startTime ? right.startTime.slice(0, 5) : "00:00";
  if (leftTime !== rightTime) {
    return leftTime.localeCompare(rightTime);
  }

  if (left.startDate !== right.startDate) {
    return left.startDate.localeCompare(right.startDate);
  }

  return left.appointmentId - right.appointmentId;
}

function buildMonthGroups(weeks: EmployeeAppointmentsUtilizationWeek[]): EmployeeAppointmentsUtilizationMonthGroup[] {
  const groups: EmployeeAppointmentsUtilizationMonthGroup[] = [];

  for (const week of weeks) {
    const existing = groups[groups.length - 1];
    if (existing && existing.key === week.monthGroupKey) {
      existing.weeks.push(week);
      continue;
    }

    groups.push({
      key: week.monthGroupKey,
      label: week.monthLabel,
      weeks: [week],
    });
  }

  return groups;
}

export function buildEmployeeAppointmentsUtilizationWindow(
  todayDate: string,
  visibleWeekCount = EMPLOYEE_APPOINTMENTS_UTILIZATION_VISIBLE_WEEK_COUNT,
): EmployeeAppointmentsUtilizationWindow {
  const visibleStart = startOfISOWeek(parseISO(todayDate));
  const visibleEnd = addDays(addWeeks(visibleStart, visibleWeekCount), -1);

  return {
    fromDate: toDateOnlyString(visibleStart),
    toDate: toDateOnlyString(visibleEnd),
    weeks: Array.from({ length: visibleWeekCount }, (_, index) => {
      const weekStart = addWeeks(visibleStart, index);
      const weekEnd = addDays(weekStart, 6);
      return {
        weekStartDate: toDateOnlyString(weekStart),
        weekEndDate: toDateOnlyString(weekEnd),
        isoYear: getISOWeekYear(weekStart),
        isoWeek: getISOWeek(weekStart),
      };
    }),
  };
}

export function buildEmployeeAppointmentsUtilizationBoardModel(params: {
  appointments: CalendarAppointment[];
  todayDate: string;
  visibleWeekCount?: number;
  locale?: Locale;
}): EmployeeAppointmentsUtilizationBoardModel {
  const locale = params.locale ?? de;
  const window = buildEmployeeAppointmentsUtilizationWindow(params.todayDate, params.visibleWeekCount);
  const visibleStart = parseISO(window.fromDate);
  const visibleEnd = parseISO(window.toDate);
  const segmentsByDate = new Map<string, EmployeeAppointmentsUtilizationSegment[]>();

  for (const appointment of params.appointments) {
    const appointmentStart = parseISO(appointment.startDate);
    const appointmentEnd = parseISO(getAppointmentEndDate(appointment));

    if (isAfter(appointmentStart, visibleEnd) || isBefore(appointmentEnd, visibleStart)) {
      continue;
    }

    const clippedStart = isBefore(appointmentStart, visibleStart) ? visibleStart : appointmentStart;
    const clippedEnd = isAfter(appointmentEnd, visibleEnd) ? visibleEnd : appointmentEnd;

    for (const currentDate of eachDayOfInterval({ start: clippedStart, end: clippedEnd })) {
      const dateKey = toDateOnlyString(currentDate);
      const nextSegments = segmentsByDate.get(dateKey) ?? [];
      nextSegments.push({
        appointmentId: appointment.id,
        date: dateKey,
        label: formatSegmentLabel(appointment, !isSameDay(currentDate, appointmentStart)),
        primaryLabel: formatPrimaryAppointmentLabel(appointment),
        secondaryLabel: appointment.tourName?.trim() || null,
        startDate: appointment.startDate,
        endDate: getAppointmentEndDate(appointment),
        startTime: appointment.startTime,
        tourColor: appointment.tourColor,
        isAllDay: !appointment.startTime,
        isContinuation: !isSameDay(currentDate, appointmentStart),
        appointment,
      });
      segmentsByDate.set(dateKey, nextSegments);
    }
  }

  for (const dateKey of segmentsByDate.keys()) {
    const segments = segmentsByDate.get(dateKey);
    if (!segments) continue;
    segments.sort(compareSegments);
  }

  const weeks = window.weeks.map((week) => {
    const weekStart = parseISO(week.weekStartDate);
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const currentDate = addDays(weekStart, dayIndex);
      const dateKey = toDateOnlyString(currentDate);
      const segments = segmentsByDate.get(dateKey) ?? [];

      return {
        date: dateKey,
        weekdayLabel: formatWeekdayLabel(currentDate, locale),
        dateLabel: format(currentDate, "dd.MM.", { locale }),
        appointmentCount: segments.length,
        segments,
      };
    });

    return {
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      title: `KW ${String(week.isoWeek).padStart(2, "0")} / ${week.isoYear}`,
      monthGroupKey: format(weekStart, "yyyy-MM"),
      monthLabel: formatMonthLabel(weekStart, locale),
      days,
    };
  });

  return {
    fromDate: window.fromDate,
    toDate: window.toDate,
    weeks,
    monthGroups: buildMonthGroups(weeks),
    totalAppointmentCount: Array.from(segmentsByDate.values()).reduce((sum, segments) => sum + segments.length, 0),
  };
}
