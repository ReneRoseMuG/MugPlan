/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Stack-Prioritaet sortiert echte Mehrtagestermine vor Eintagesterminen.
 * - Grid-Start und Grid-Span clippen an sichtbaren Wochengrenzen.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine werden nicht vorgezogen.
 * - Grid-Berechnung laeuft ueber Wochenanfang oder Wochenende hinaus.
 *
 * Ziel:
 * Pure Kalender-Helper fuer die neue Wochen-Renderlogik deterministisch absichern.
 */
import { addDays, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import {
  getAppointmentStackPriority,
  getWeekAppointmentGridSpan,
  getWeekAppointmentGridStartColumn,
} from "../../../client/src/lib/calendar-utils";

const baseAppointment: CalendarAppointment = {
  id: 1,
  version: 1,
  projectId: 10,
  projectName: "Projekt",
  projectVersion: 1,
  projectOrderNumber: "A-1",
  projectDescription: "Beschreibung",
  project: null,
  startDate: "2026-03-02",
  endDate: null,
  startTime: null,
  tourId: 2,
  tourName: "Tour 2",
  tourColor: "#123456",
  customer: {
    id: 4,
    customerNumber: "K-1",
    fullName: "Kunde",
    addressLine1: "Strasse 1",
    addressLine2: null,
    postalCode: "12345",
    city: "Berlin",
  },
  customerNotesCount: 0,
  projectNotesCount: 0,
  appointmentNotesCount: 0,
  appointmentAttachmentsCount: 0,
  displayMode: "standard",
  employees: [],
  isLocked: false,
};

describe("FT03 UI: calendar week spanning tile helpers", () => {
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(parseISO("2026-03-02"), index));

  it("prioritizes real multi-day appointments before single-day appointments", () => {
    expect(getAppointmentStackPriority({ ...baseAppointment, endDate: "2026-03-04" })).toBe(0);
    expect(getAppointmentStackPriority({ ...baseAppointment, endDate: null, startTime: null })).toBe(1);
    expect(getAppointmentStackPriority({ ...baseAppointment, endDate: null, startTime: "08:30:00" })).toBe(2);
  });

  it("clips start column to the current week start", () => {
    expect(
      getWeekAppointmentGridStartColumn(
        { ...baseAppointment, startDate: "2026-02-27", endDate: "2026-03-03" },
        weekDays,
      ),
    ).toBe(1);

    expect(
      getWeekAppointmentGridStartColumn(
        { ...baseAppointment, startDate: "2026-03-04", endDate: "2026-03-06" },
        weekDays,
      ),
    ).toBe(3);
  });

  it("clips spanning width to the visible week range", () => {
    expect(
      getWeekAppointmentGridSpan(
        { ...baseAppointment, startDate: "2026-03-02", endDate: "2026-03-04" },
        weekDays,
      ),
    ).toBe(3);

    expect(
      getWeekAppointmentGridSpan(
        { ...baseAppointment, startDate: "2026-03-06", endDate: "2026-03-10" },
        weekDays,
      ),
    ).toBe(3);
  });
});
