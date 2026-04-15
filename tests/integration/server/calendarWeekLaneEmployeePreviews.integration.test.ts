/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Lane-Preview trennt Wochenplan-Mitarbeiter und zusätzliche Tageszuweisungen serverseitig.
 * - Individuelle Tageszuweisungen werden um bereits aus der Wochenplanung enthaltene Mitarbeiter dedupliziert.
 * - Tage ohne Termin, aber mit Wochenplanung, liefern weiterhin den Wochenplan-Block.
 * - Die System-Tour `Parkplatz` blendet Legacy-Wochenzuweisungen im Lane-Preview aus.
 *
 * Fehlerfaelle:
 * - Wochenplan- und Termin-Mitarbeiter werden ungetrennt gemischt.
 * - Dieselbe Person erscheint doppelt in beiden Gruppen.
 * - Tage ohne Termin verlieren den Wochenplan-Preview.
 * - Legacy-Wochenzuweisungen der Tour `Parkplatz` erscheinen weiter als Hover-Preview.
 *
 * Ziel:
 * Den neuen Kalender-Read fuer tourbezogene Tages-Hover-Previews end-to-end ueber die reale API absichern.
 */
import type express from "express";
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../../server/db";
import { tourWeekEmployees, tours } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

function resolveTargetWeekDates() {
  const weekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 2));
  return {
    weekStart,
    monday: format(weekStart, "yyyy-MM-dd"),
    tuesday: format(addDays(weekStart, 1), "yyyy-MM-dd"),
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
  };
}

async function renameTour(tourId: number, name: string): Promise<void> {
  await db
    .update(tours)
    .set({ name })
    .where(eq(tours.id, tourId));
}

describe("calendar week lane employee previews integration", () => {
  it("groups week employees separately from additional day employees and keeps week-only days", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#336699");
    const project = await createProjectFixture({ prefix: "CAL-LANE-PREVIEW" });
    const weekEmployee = await createEmployeeFixture("CAL-LANE-WEEK");
    const additionalEmployee = await createEmployeeFixture("CAL-LANE-ADD");
    const week = resolveTargetWeekDates();

    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      employeeId: weekEmployee.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: week.monday,
      tourId: tour.id,
      employeeIds: [weekEmployee.id, additionalEmployee.id],
    });

    const response = await admin
      .get(`/api/calendar/week-lane-employee-previews?fromDate=${week.monday}&toDate=${week.tuesday}`)
      .expect(200);

    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        date: week.monday,
        tourId: tour.id,
        weekEmployees: [{ id: weekEmployee.id, fullName: weekEmployee.fullName }],
        additionalDayEmployees: [{ id: additionalEmployee.id, fullName: additionalEmployee.fullName }],
      }),
      expect.objectContaining({
        date: week.tuesday,
        tourId: tour.id,
        weekEmployees: [{ id: weekEmployee.id, fullName: weekEmployee.fullName }],
        additionalDayEmployees: [],
      }),
    ]));
  });

  it("hides legacy Parkplatz week assignments from the lane preview and does not seed week-only preview days", async () => {
    const admin = await loginAdmin();
    const parkplatzTour = await createTourFixture("#d4537e");
    const project = await createProjectFixture({ prefix: "CAL-LANE-PARKPLATZ" });
    const weekEmployee = await createEmployeeFixture("CAL-LANE-PARKPLATZ-WEEK");
    const week = resolveTargetWeekDates();

    await renameTour(parkplatzTour.id, "Parkplatz");

    await db.insert(tourWeekEmployees).values({
      tourId: parkplatzTour.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      employeeId: weekEmployee.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: week.monday,
      tourId: parkplatzTour.id,
      employeeIds: [],
    });

    const response = await admin
      .get(`/api/calendar/week-lane-employee-previews?fromDate=${week.monday}&toDate=${week.tuesday}`)
      .expect(200);

    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        date: week.monday,
        tourId: parkplatzTour.id,
        weekEmployees: [],
        additionalDayEmployees: [],
      }),
    ]));
    expect(response.body.find((entry: { date: string; tourId: number }) =>
      entry.tourId === parkplatzTour.id && entry.date === week.tuesday,
    )).toBeUndefined();
  });
});
