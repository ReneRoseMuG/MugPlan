/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Lueckenfuellung
 *
 * Abgedeckte Regeln:
 * - Eintagestermine nutzen freie Zellen innerhalb der bestehenden Spanning-Zone.
 * - Reine Eintages-Lanes erhalten genau eine implizite Tile-Zeile.
 * - Ueberlauf aktiviert die untere DayCell-Zeile nur bei fehlendem Platz.
 * - Reine Mehrtages-Lanes benoetigen keine Overflow-Zeile.
 *
 * Fehlerfaelle:
 * - Eintagestermine landen trotz freier Luecke direkt im Overflow.
 * - Lanes ohne Mehrtagestermine erzeugen keine nutzbare Tile-Zeile.
 *
 * Ziel:
 * Die reine Platzierungslogik der Wochenansicht deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import { buildWeekLaneRenderData } from "../../../client/src/components/calendar/CalendarWeekView";

type WeekLaneInput = Parameters<typeof buildWeekLaneRenderData>[0];

const baseAppointment: CalendarAppointment = {
  id: 1,
  version: 1,
  projectId: 10,
  projectName: "Projekt",
  projectVersion: 1,
  projectOrderNumber: "A-1",
  projectDescription: "Beschreibung",
  projectStatuses: [],
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
  displayMode: "standard",
  employees: [],
  isLocked: false,
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
    projectStatuses: overrides.projectStatuses ?? baseAppointment.projectStatuses,
  };
}

function createLane(dayAppointments: number[][]): WeekLaneInput {
  return {
    laneKey: "tour-2",
    label: "Tour 2",
    color: "#123456",
    tourId: 2,
    members: [],
    dayBuckets: dayAppointments.map((appointments, dayIndex) => ({
      dayIndex,
      dateKey: `2026-03-0${dayIndex + 2}`,
      appointments,
    })),
  };
}

describe("FT03 UI: CalendarWeekView lane placement", () => {
  it("places a single-day appointment into a free spanning-row gap before overflow", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-04" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-05", endDate: null })],
    ]);

    const lane = createLane([
      [1],
      [1],
      [1],
      [2],
      [],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.needsDayCellRow).toBe(false);
    expect(renderData.singleDayGridItems).toEqual([{ appointmentId: 2, gridColumn: 4, gridRow: 1 }]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[], [], [], [], [], [], []]);
  });

  it("creates one implicit tile row for lanes with only single-day appointments", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02" })],
    ]);

    const lane = createLane([
      [1],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.singleDayGridItems).toEqual([{ appointmentId: 1, gridColumn: 1, gridRow: 1 }]);
    expect(renderData.needsDayCellRow).toBe(false);
  });

  it("moves extra single-day appointments into overflow when a day column runs out of tile rows", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-02", startTime: "08:30:00" })],
      [3, createAppointment({ id: 3, startDate: "2026-03-02", startTime: "10:30:00" })],
    ]);

    const lane = createLane([
      [1, 2, 3],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.singleDayGridItems).toEqual([{ appointmentId: 1, gridColumn: 1, gridRow: 1 }]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[2, 3], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(true);
  });

  it("keeps pure multi-day lanes out of the overflow row", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-04" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-05", endDate: "2026-03-06" })],
    ]);

    const lane = createLane([
      [1],
      [1],
      [1],
      [2],
      [2],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(2);
    expect(renderData.singleDayGridItems).toEqual([]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(false);
  });
});
