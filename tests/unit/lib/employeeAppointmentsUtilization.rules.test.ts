/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auslastungslogik erzeugt ein festes 6-Wochen-Fenster ab Montag der aktuellen ISO-Woche.
 * - Monatsgruppen orientieren sich am Wochen-Montag und bleiben damit eindeutig.
 * - Tagessegmente werden mit Ganztags-Prioritaet und Zeitsortierung aufgebaut.
 * - Mehrtagestermine erscheinen an jedem sichtbaren Tag und markieren Folgetage als Fortsetzung.
 *
 * Fehlerfälle:
 * - Das Fenster startet nicht an der aktuellen ISO-Woche oder umfasst nicht genau 6 Wochen.
 * - Wochen werden dem falschen Monat zugeordnet.
 * - Ganztägige oder mehrtägige Termine werden pro Tag falsch sortiert oder unvollständig segmentiert.
 *
 * Ziel:
 * Die reine Modellierung der Mitarbeiter-Auslastungsansicht deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import {
  buildEmployeeAppointmentsUtilizationBoardModel,
  buildEmployeeAppointmentsUtilizationWindow,
} from "../../../client/src/lib/employee-appointments-utilization";

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 1,
    version: 1,
    projectId: 77,
    projectName: "Projekt Nord",
    projectVersion: 1,
    projectOrderNumber: null,
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2026-04-15",
    endDate: null,
    startTime: "13:00:00",
    tourId: 9,
    tourName: "Tour Nord",
    tourColor: "#225588",
    customer: {
      id: 5,
      customerNumber: "K-100",
      fullName: "Kunde Nord",
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
    employees: [{ id: 11, fullName: "Mitarbeiter, Mia" }],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("employee appointments utilization model", () => {
  it("builds a fixed six-week ISO window from the current week", () => {
    const window = buildEmployeeAppointmentsUtilizationWindow("2026-04-15");

    expect(window.fromDate).toBe("2026-04-13");
    expect(window.toDate).toBe("2026-05-24");
    expect(window.weeks).toHaveLength(6);
    expect(window.weeks[0]).toMatchObject({
      weekStartDate: "2026-04-13",
      weekEndDate: "2026-04-19",
      isoYear: 2026,
      isoWeek: 16,
    });
    expect(window.weeks[5]).toMatchObject({
      weekStartDate: "2026-05-18",
      weekEndDate: "2026-05-24",
      isoYear: 2026,
      isoWeek: 21,
    });
  });

  it("groups weeks by the month of their week start and sorts day segments deterministically", () => {
    const board = buildEmployeeAppointmentsUtilizationBoardModel({
      todayDate: "2026-04-15",
      appointments: [
        createAppointment({
          id: 1,
          startDate: "2026-04-15",
          startTime: "13:00:00",
          projectName: "Projekt Spät",
        }),
        createAppointment({
          id: 2,
          startDate: "2026-04-15",
          startTime: null,
          projectName: "Projekt Ganztag",
        }),
        createAppointment({
          id: 3,
          startDate: "2026-04-14",
          endDate: "2026-04-16",
          startTime: "09:30:00",
          projectName: "Projekt Mehrtag",
        }),
      ],
    });

    expect(board.monthGroups).toHaveLength(2);
    expect(board.monthGroups[0]).toMatchObject({
      key: "2026-04",
      label: "April 2026",
    });
    expect(board.monthGroups[0].weeks).toHaveLength(3);
    expect(board.monthGroups[1]).toMatchObject({
      key: "2026-05",
      label: "Mai 2026",
    });
    expect(board.monthGroups[1].weeks).toHaveLength(3);

    const targetWeek = board.weeks.find((week) => week.weekStartDate === "2026-04-13");
    expect(targetWeek).toBeDefined();

    const targetDay = targetWeek?.days.find((day) => day.date === "2026-04-15");
    expect(targetDay?.appointmentCount).toBe(3);
    expect(targetDay?.segments.map((segment) => [segment.appointmentId, segment.label])).toEqual([
      [2, "Ganztägig"],
      [3, "Fortsetzung"],
      [1, "13:00"],
    ]);
  });

  it("creates visible continuation segments for each day of a multi-day appointment", () => {
    const board = buildEmployeeAppointmentsUtilizationBoardModel({
      todayDate: "2026-04-15",
      appointments: [
        createAppointment({
          id: 44,
          startDate: "2026-04-14",
          endDate: "2026-04-16",
          startTime: "08:15:00",
          projectName: "Projekt Folge",
        }),
      ],
    });

    const targetWeek = board.weeks.find((week) => week.weekStartDate === "2026-04-13");
    expect(targetWeek).toBeDefined();

    const firstDay = targetWeek?.days.find((day) => day.date === "2026-04-14");
    const middleDay = targetWeek?.days.find((day) => day.date === "2026-04-15");
    const lastDay = targetWeek?.days.find((day) => day.date === "2026-04-16");

    expect(firstDay?.segments).toHaveLength(1);
    expect(firstDay?.segments[0]).toMatchObject({
      appointmentId: 44,
      label: "08:15",
      isContinuation: false,
    });

    expect(middleDay?.segments).toHaveLength(1);
    expect(middleDay?.segments[0]).toMatchObject({
      appointmentId: 44,
      label: "Fortsetzung",
      isContinuation: true,
    });

    expect(lastDay?.segments).toHaveLength(1);
    expect(lastDay?.segments[0]).toMatchObject({
      appointmentId: 44,
      label: "Fortsetzung",
      isContinuation: true,
    });
  });
});
