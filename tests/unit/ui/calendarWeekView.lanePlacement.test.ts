/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Lane-Platzierung
 *
 * Abgedeckte Regeln:
 * - Nicht ueberlappende Mehrtagestermine derselben Tour-Lane wiederverwenden die oberste Zeile.
 * - Eintagestermine nutzen freie Zellen innerhalb der bestehenden Spanning-Zone.
 * - Mehrtagestermine bleiben auch um freie Luecken mit Eintagesterminen herum in derselben oberen Zeile.
 * - Reine Eintages-Lanes erhalten genau eine implizite Tile-Zeile.
 * - Zusätzliche Termine eines durch Mehrtagestermine belegten Tages weichen in die untere DayCell-Zeile aus.
 *
 * Fehlerfaelle:
 * - Spätere Mehrtagestermine rutschen trotz freier oberer Zeile in eine neue Zeile.
 * - Eintagestermine landen trotz freier Luecke direkt im Overflow.
 * - Zusätzliche Tagestermine überdecken Mehrtagestermine statt darunter auszuweichen.
 *
 * Ziel:
 * Die Platzierungslogik der Wochenansicht entsprechend des gewuenschten Tour-Lane-Zielverhaltens deterministisch absichern.
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
  customerAttachmentsCount: 0,
  projectAttachmentsCount: 0,
  appointmentAttachmentsCount: 0,
  totalAttachmentsCount: 0,
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
  it("reuses the top spanning row for back-to-back multi-day appointments without overlap", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-03" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-05", endDate: "2026-03-06" })],
    ]);

    const lane = createLane([
      [1],
      [1],
      [],
      [2],
      [2],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.spanningAppointments).toEqual([
      { appointmentId: 1, rowIndex: 0 },
      { appointmentId: 2, rowIndex: 0 },
    ]);
    expect(renderData.singleDayGridItems).toEqual([]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(false);
  });

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

  it("keeps surrounding multi-day appointments in the same top row around a free single-day gap", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-03" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-04", endDate: null, startTime: "08:00:00" })],
      [3, createAppointment({ id: 3, startDate: "2026-03-05", endDate: "2026-03-06" })],
    ]);

    const lane = createLane([
      [1],
      [1],
      [2],
      [3],
      [3],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.spanningAppointments).toEqual([
      { appointmentId: 1, rowIndex: 0 },
      { appointmentId: 3, rowIndex: 0 },
    ]);
    expect(renderData.singleDayGridItems).toEqual([{ appointmentId: 2, gridColumn: 3, gridRow: 1 }]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(false);
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

  it("moves additional same-day appointments into the lower day-cell row when the spanning row is occupied", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-03" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-02", startTime: "08:30:00" })],
      [3, createAppointment({ id: 3, startDate: "2026-03-02", startTime: "10:30:00" })],
    ]);

    const lane = createLane([
      [1, 2, 3],
      [1],
      [],
      [],
      [],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(1);
    expect(renderData.spanningAppointments).toEqual([{ appointmentId: 1, rowIndex: 0 }]);
    expect(renderData.singleDayGridItems).toEqual([]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[2, 3], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(true);
  });

  it("keeps overlapping multi-day appointments separated when a real collision exists", () => {
    const appointments = new Map<number, CalendarAppointment>([
      [1, createAppointment({ id: 1, startDate: "2026-03-02", endDate: "2026-03-04" })],
      [2, createAppointment({ id: 2, startDate: "2026-03-05", endDate: "2026-03-06" })],
      [3, createAppointment({ id: 3, startDate: "2026-03-04", endDate: "2026-03-06" })],
    ]);

    const lane = createLane([
      [1],
      [1],
      [1, 3],
      [2, 3],
      [2, 3],
      [],
      [],
    ]);

    const renderData = buildWeekLaneRenderData(lane, appointments);

    expect(renderData.tileRowCount).toBe(2);
    expect([...renderData.spanningAppointments].sort((a, b) => a.appointmentId - b.appointmentId)).toEqual([
      { appointmentId: 1, rowIndex: 0 },
      { appointmentId: 2, rowIndex: 0 },
      { appointmentId: 3, rowIndex: 1 },
    ]);
    expect(renderData.singleDayGridItems).toEqual([]);
    expect(renderData.singleDayOverflowByBucket).toEqual([[], [], [], [], [], [], []]);
    expect(renderData.needsDayCellRow).toBe(false);
  });
});
