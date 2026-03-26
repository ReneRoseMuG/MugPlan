/**
 * Test Scope:
 *
 * Bereich:
 * - Monatskalender Tour-Slot-Layout
 *
 * Abgedeckte Regeln:
 * - Tourslots werden alphabetisch aufgebaut und um den festen Slot "Ohne Tour" ergänzt.
 * - Die Wochenzeilenhöhe richtet sich pro Slot nach dem Maximum über alle sieben Tage.
 * - Leere Slots behalten mindestens eine Unterzeile als stabiles Drag-Ziel.
 * - Mehrtagestermine werden vor Eintagesterminen sortiert und an Wochenrändern korrekt geklippt.
 *
 * Fehlerfälle:
 * - Slots verlieren den festen "Ohne Tour"-Fallback.
 * - Wochenhöhen schrumpfen trotz leerer Slots auf null Zeilen.
 * - Mehrtagestermine erhalten falsche Segmentgrenzen oder verdrängen die Sortierung.
 *
 * Ziel:
 * Die pure Monats-Slot-Logik deterministisch absichern, ohne das UI-Rendering selbst zu benötigen.
 */
import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import {
  buildMonthSlotBarsForDay,
  buildMonthTourSlots,
  buildMonthWeekRowLayout,
} from "../../../client/src/components/calendar/monthLaneState";
import type { Tour } from "../../../shared/schema";

const baseAppointment: CalendarAppointment = {
  id: 1,
  version: 1,
  projectId: 10,
  projectName: "Projekt",
  projectVersion: 1,
  projectOrderNumber: "A-1",
  projectArticleItems: [],
  projectDescription: "Beschreibung",
  project: null,
  startDate: "2026-03-02",
  endDate: null,
  startTime: null,
  tourId: 1,
  tourName: "Alpha",
  tourColor: "#225588",
  customer: {
    id: 4,
    customerNumber: "K-1",
    fullName: "Kunde",
    postalCode: "12345",
    city: "Berlin",
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
};

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    ...baseAppointment,
    ...overrides,
    customer: {
      ...baseAppointment.customer,
      ...overrides.customer,
    },
    employees: overrides.employees ?? baseAppointment.employees,
  };
}

function createWeekDays(startDate: Date) {
  return Array.from({ length: 7 }, (_, dayIndex) => addDays(startDate, dayIndex));
}

describe("month lane state rules", () => {
  it("builds named tour slots alphabetically and appends the unassigned slot", () => {
    const tours: Tour[] = [
      { id: 2, name: "Bravo", color: "#222222", version: 1 },
      { id: 1, name: "Alpha", color: "#111111", version: 1 },
    ];

    const slots = buildMonthTourSlots(tours);

    expect(slots).toEqual([
      { tourId: 1, label: "Alpha", color: "#111111", slotIndex: 0 },
      { tourId: 2, label: "Bravo", color: "#222222", slotIndex: 1 },
      { tourId: null, label: "Ohne Tour", color: null, slotIndex: 2 },
    ]);
  });

  it("uses the per-slot weekly maximum and keeps empty slots at one sub row", () => {
    const weekDays = createWeekDays(new Date(2026, 2, 2));
    const slots = buildMonthTourSlots([
      { id: 1, name: "Alpha", color: "#111111", version: 1 },
      { id: 2, name: "Bravo", color: "#222222", version: 1 },
    ]);
    const appointments = [
      createAppointment({ id: 11, tourId: 1, startDate: "2026-03-03" }),
      createAppointment({ id: 12, tourId: 1, startDate: "2026-03-03", startTime: "10:00:00" }),
      createAppointment({ id: 13, tourId: 2, startDate: "2026-03-02", endDate: "2026-03-04" }),
    ];

    const layout = buildMonthWeekRowLayout(weekDays, slots, appointments);

    expect(layout.subRowCountByTourId.get(1)).toBe(2);
    expect(layout.subRowCountByTourId.get(2)).toBe(1);
    expect(layout.subRowCountByTourId.get(null)).toBe(1);
    expect(layout.rowHeightPx).toBe(145);
  });

  it("clips bars to the visible week and keeps multi-day bars ahead of single-day bars", () => {
    const weekDays = createWeekDays(new Date(2026, 2, 2));
    const slot = { tourId: 1, label: "Alpha", color: "#111111", slotIndex: 0 };
    const appointments = [
      createAppointment({ id: 21, tourId: 1, startDate: "2026-03-01", endDate: "2026-03-03" }),
      createAppointment({ id: 22, tourId: 1, startDate: "2026-03-02", endDate: "2026-03-04" }),
      createAppointment({ id: 23, tourId: 1, startDate: "2026-03-02", startTime: "09:00:00" }),
    ];

    const bars = buildMonthSlotBarsForDay(0, slot, weekDays, appointments);

    expect(bars).toEqual([
      {
        appointmentId: 21,
        subRowIndex: 0,
        startDayIndex: 0,
        endDayIndex: 1,
        isMultiDay: true,
      },
      {
        appointmentId: 22,
        subRowIndex: 1,
        startDayIndex: 0,
        endDayIndex: 2,
        isMultiDay: true,
      },
      {
        appointmentId: 23,
        subRowIndex: 2,
        startDayIndex: 0,
        endDayIndex: 0,
        isMultiDay: false,
      },
    ]);
  });
});
