import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Tour } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import {
  compareTourNamesForCalendar,
  getAppointmentDurationDays,
  getAppointmentEndDate,
} from "@/lib/calendar-utils";

/** Ein konfigurierter Tour-Slot. tourId === null = "Ohne Tour". */
export type MonthTourSlot = {
  tourId: number | null;
  label: string;
  color: string | null;
  /** Aufsteigende Sortierposition (0 = erste Tour) */
  slotIndex: number;
};

/**
 * Layout einer einzelnen Wochenzeile im Monatskalender.
 * Alle 7 Tageskarten der Zeile teilen diese Struktur.
 */
export type MonthWeekRowLayout = {
  slots: MonthTourSlot[];
  /**
   * Pro Slot: wie viele Unterzeilen (Balken) braucht dieser Slot
   * in der gesamten Wochenzeile (Maximum über alle 7 Tage).
   * Key = tourId (null für "Ohne Tour").
   */
  subRowCountByTourId: Map<number | null, number>;
  /** Vorberechnete Pixelhöhe der Tageskarte für diese Zeile */
  rowHeightPx: number;
};

/** Ein platzierter Terminbalken innerhalb eines Tour-Slots. */
export type MonthSlotBarItem = {
  appointmentId: number;
  /** Index der Unterzeile innerhalb des Slots (0-basiert) */
  subRowIndex: number;
  /** Tages-Index innerhalb der Woche (0 = Mo … 6 = So) */
  startDayIndex: number;
  /** Tages-Index innerhalb der Woche, letzter Tag des Segments */
  endDayIndex: number;
  isMultiDay: boolean;
};

export const MONTH_SLOT_SEPARATOR_HEIGHT_PX = 3;
export const MONTH_SLOT_BAR_HEIGHT_PX = 22;
export const MONTH_SLOT_BAR_GAP_PX = 2;
export const MONTH_DAY_HEADER_HEIGHT_PX = 34;
export const MONTH_SLOT_PADDING_BOTTOM_PX = 4;

/**
 * Baut die geordnete Slot-Liste aus dem Tour-Stammdatensatz.
 * Reihenfolge im derzeitigen Repo-Stand: benannte Touren alphabetisch,
 * dann "Ohne Tour" (tourId = null).
 */
export function buildMonthTourSlots(tours: Tour[]): MonthTourSlot[] {
  const slots: MonthTourSlot[] = tours
    .slice()
    .sort((a, b) => compareTourNamesForCalendar(a.name, b.name))
    .map((tour, slotIndex) => ({
    tourId: tour.id,
    label: tour.name,
    color: tour.color ?? null,
    slotIndex,
    }));

  slots.push({
    tourId: null,
    label: "Ohne Tour",
    color: null,
    slotIndex: slots.length,
  });

  return slots;
}

/**
 * Berechnet das Layout einer Wochenzeile.
 *
 * @param weekDays Array mit 7 Date-Objekten Mo–So
 * @param slots Ergebnis von buildMonthTourSlots
 * @param appointments Alle Termine, die diese Woche berühren
 */
export function buildMonthWeekRowLayout(
  weekDays: Date[],
  slots: MonthTourSlot[],
  appointments: CalendarAppointment[],
): MonthWeekRowLayout {
  const weekStart = weekDays[0];
  const countMap = new Map<string, number>();

  for (const appointment of appointments) {
    const startDayIndex = Math.max(0, differenceInCalendarDays(parseISO(appointment.startDate), weekStart));
    const endDayIndex = Math.min(
      6,
      differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), weekStart),
    );

    for (let dayIndex = startDayIndex; dayIndex <= endDayIndex; dayIndex += 1) {
      const key = `${appointment.tourId ?? "null"}:${dayIndex}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
  }

  const subRowCountByTourId = new Map<number | null, number>();
  for (const slot of slots) {
    let max = 0;
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const key = `${slot.tourId ?? "null"}:${dayIndex}`;
      max = Math.max(max, countMap.get(key) ?? 0);
    }
    subRowCountByTourId.set(slot.tourId, Math.max(1, max));
  }

  let contentHeight = 0;
  for (const slot of slots) {
    const subRows = subRowCountByTourId.get(slot.tourId) ?? 1;
    contentHeight +=
      MONTH_SLOT_SEPARATOR_HEIGHT_PX +
      subRows * MONTH_SLOT_BAR_HEIGHT_PX +
      (subRows - 1) * MONTH_SLOT_BAR_GAP_PX +
      MONTH_SLOT_PADDING_BOTTOM_PX;
  }

  return {
    slots,
    subRowCountByTourId,
    rowHeightPx: MONTH_DAY_HEADER_HEIGHT_PX + contentHeight,
  };
}

/**
 * Gibt die sortierten Balken für einen Tag und einen Tour-Slot zurück.
 * Mehrtagestermine landen in subRowIndex 0 … n-1 (Reihenfolge: Mehrtagestermine als Erstes,
 * dann Einzeltermine – analog zur WeekView).
 */
export function buildMonthSlotBarsForDay(
  dayIndex: number,
  slot: MonthTourSlot,
  weekDays: Date[],
  appointments: CalendarAppointment[],
): MonthSlotBarItem[] {
  const weekStart = weekDays[0];
  const dayDate = weekDays[dayIndex];

  const relevant = appointments.filter((appointment) => {
    if ((appointment.tourId ?? null) !== slot.tourId) {
      return false;
    }

    const start = parseISO(appointment.startDate);
    const end = parseISO(getAppointmentEndDate(appointment));
    return start <= dayDate && end >= dayDate;
  });

  relevant.sort((a, b) => {
    const aMultiDayRank = getAppointmentDurationDays(a) > 0 ? 0 : 1;
    const bMultiDayRank = getAppointmentDurationDays(b) > 0 ? 0 : 1;
    if (aMultiDayRank !== bMultiDayRank) {
      return aMultiDayRank - bMultiDayRank;
    }

    const startTimeCompare = (a.startTime ?? "").localeCompare(b.startTime ?? "");
    if (startTimeCompare !== 0) {
      return startTimeCompare;
    }

    return a.id - b.id;
  });

  return relevant.map((appointment, subRowIndex) => ({
    appointmentId: appointment.id,
    subRowIndex,
    startDayIndex: Math.max(0, differenceInCalendarDays(parseISO(appointment.startDate), weekStart)),
    endDayIndex: Math.min(
      6,
      differenceInCalendarDays(parseISO(getAppointmentEndDate(appointment)), weekStart),
    ),
    isMultiDay: getAppointmentDurationDays(appointment) > 0,
  }));
}
