/**
 * Test Scope:
 *
 * Bereich:
 * - Kalender Datum-, KW- und Sortierkonsistenz
 *
 * Abgedeckte Regeln:
 * - ISO-KW und ISO-KW-Jahr bleiben fuer relevante Beispieltermine stabil.
 * - Enddatum und Dauer folgen fuer Ein- und Mehrtagestermine derselben Logik wie in Woche und Monat.
 * - Gleichtaegige Termine werden anhand von Datum, Uhrzeit und ID stabil sortiert.
 *
 * Fehlerfaelle:
 * - KW- oder Jahresgrenzen kippen bei Monats- oder Wochenwechseln.
 * - Mehrtagestermine liefern falsche Dauer oder ein falsches sichtbares Enddatum.
 * - Gleichtaegige Termine verlieren ihre Reihenfolge.
 *
 * Ziel:
 * Die gemeinsame Datums- und Sortierbasis fuer die Kalenderkonsistenz-Suite isoliert absichern.
 */
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";

import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import { getAppointmentDurationDays, getAppointmentEndDate, getAppointmentSortValue } from "../../../client/src/lib/calendar-utils";

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 1,
    version: 1,
    projectId: 11,
    projectName: "Calendar Consistency",
    projectVersion: 1,
    projectOrderNumber: "ORD-1",
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2026-04-10",
    endDate: null,
    startTime: null,
    tourId: 2,
    tourName: "Tour 2",
    tourColor: "#2563eb",
    customer: {
      id: 4,
      customerNumber: "K-1",
      fullName: "Kunde",
      postalCode: "26135",
      city: "Oldenburg",
    },
    customerNotesCount: 0,
    projectNotesCount: 0,
    appointmentNotesCount: 0,
    customerAttachmentsCount: 0,
    projectAttachmentsCount: 0,
    appointmentAttachmentsCount: 0,
    totalAttachmentsCount: 0,
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    displayMode: "standard",
    employees: [],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("calendar consistency date and week rules", () => {
  it("keeps ISO week numbers and ISO week years stable around month and year boundaries", () => {
    expect(getISOWeek(parseISO("2026-04-10"))).toBe(15);
    expect(getISOWeekYear(parseISO("2026-04-10"))).toBe(2026);
    expect(getISOWeek(parseISO("2026-05-01"))).toBe(18);
    expect(getISOWeekYear(parseISO("2026-05-01"))).toBe(2026);
    expect(getISOWeek(parseISO("2027-01-01"))).toBe(53);
    expect(getISOWeekYear(parseISO("2027-01-01"))).toBe(2026);
  });

  it("resolves end dates and durations for same-day, overlapping and cross-week appointments", () => {
    const sameDayEarlyA = createAppointment({
      id: 10,
      startDate: "2026-04-10",
      startTime: "08:00:00",
    });
    const sameDayLateA = createAppointment({
      id: 11,
      startDate: "2026-04-10",
      startTime: "15:30:00",
    });
    const sameDayNoonB = createAppointment({
      id: 12,
      startDate: "2026-04-10",
      startTime: "12:00:00",
      tourId: 3,
      tourName: "Tour 3",
      tourColor: "#dc2626",
    });
    const overlappingMultiDay1 = createAppointment({
      id: 13,
      startDate: "2026-04-15",
      endDate: "2026-04-17",
    });
    const overlappingMultiDay2 = createAppointment({
      id: 14,
      startDate: "2026-04-16",
      endDate: "2026-04-18",
    });
    const crossWeekSpan = createAppointment({
      id: 15,
      startDate: "2026-05-29",
      endDate: "2026-06-01",
      tourId: 3,
      tourName: "Tour 3",
      tourColor: "#dc2626",
    });

    expect(getAppointmentEndDate(sameDayEarlyA)).toBe("2026-04-10");
    expect(getAppointmentDurationDays(sameDayEarlyA)).toBe(0);
    expect(getAppointmentEndDate(sameDayLateA)).toBe("2026-04-10");
    expect(getAppointmentDurationDays(sameDayLateA)).toBe(0);
    expect(getAppointmentEndDate(sameDayNoonB)).toBe("2026-04-10");
    expect(getAppointmentDurationDays(sameDayNoonB)).toBe(0);
    expect(getAppointmentEndDate(overlappingMultiDay1)).toBe("2026-04-17");
    expect(getAppointmentDurationDays(overlappingMultiDay1)).toBe(2);
    expect(getAppointmentEndDate(overlappingMultiDay2)).toBe("2026-04-18");
    expect(getAppointmentDurationDays(overlappingMultiDay2)).toBe(2);
    expect(getAppointmentEndDate(crossWeekSpan)).toBe("2026-06-01");
    expect(getAppointmentDurationDays(crossWeekSpan)).toBe(3);
  });

  it("sorts same-day appointments by time and falls back to ID for identical timestamps", () => {
    const sameDayEarlyA = createAppointment({
      id: 10,
      startDate: "2026-04-10",
      startTime: "08:00:00",
    });
    const sameDayLateA = createAppointment({
      id: 11,
      startDate: "2026-04-10",
      startTime: "15:30:00",
    });
    const sameDayNoonB = createAppointment({
      id: 12,
      startDate: "2026-04-10",
      startTime: "12:00:00",
    });
    const sameTimeHigherId = createAppointment({
      id: 13,
      startDate: "2026-04-10",
      startTime: "12:00:00",
    });

    const sorted = [sameDayLateA, sameTimeHigherId, sameDayNoonB, sameDayEarlyA]
      .sort((a, b) => getAppointmentSortValue(a).localeCompare(getAppointmentSortValue(b)))
      .map((appointment) => appointment.id);

    expect(sorted).toEqual([10, 12, 13, 11]);
  });
});
