/**
 * Test Scope:
 *
 * Feature: FT28 – Terminliste Sortierung in Tour-/Mitarbeiter-Formular
 * Use Case: UC Terminliste standardmaessig abwaerts nach Datum
 *
 * Abgedeckte Regeln:
 * - /api/appointments/list liefert im Tour-Kontext standardmaessig abwaerts nach Datum/Zeit/ID.
 * - /api/appointments/list liefert im Mitarbeiter-Kontext standardmaessig abwaerts nach Datum.
 *
 * Fehlerfaelle:
 * - Liste wird nicht abwaerts ausgeliefert.
 * - Filterkontext (tourId/employeeId) liefert Fremdtermine.
 *
 * Ziel:
 * Serverseitigen Sortiervertrag der Formular-Terminlisten regressionssicher absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  loginAdminAgent,
  resetAppointmentOverlapFixtureCounters,
} from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(() => {
  resetAppointmentOverlapFixtureCounters();
});

describe("FT28 integration: appointments list default sorting", () => {
  it("returns tour-filtered list descending by date/time/id", async () => {
    const agent = await loginAdminAgent(app);
    const tour = await createTourFixture("#0099aa");
    const { project } = await createProjectFixture("FT28-TOUR-A");
    const { project: secondProject } = await createProjectFixture("FT28-TOUR-B");

    const older = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-10",
      startTime: "09:00:00",
      tourId: tour.id,
      employeeIds: [],
    });
    const sameDateEarlier = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-11",
      startTime: "08:00:00",
      tourId: tour.id,
      employeeIds: [],
    });
    const sameDateLater = await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: "2099-10-11",
      startTime: "12:00:00",
      tourId: tour.id,
      employeeIds: [],
    });

    await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: "2099-10-12",
      startTime: "07:00:00",
      tourId: null,
      employeeIds: [],
    });

    const response = await agent
      .get(`/api/appointments/list?tourId=${tour.id}&page=1&pageSize=50`)
      .expect(200);

    const items = response.body.items as Array<{ id: number; tourId: number | null }>;
    expect(items.map((entry) => entry.id)).toEqual([sameDateLater.id, sameDateEarlier.id, older.id]);
    expect(items.every((entry) => entry.tourId === tour.id)).toBe(true);
  });

  it("returns employee-filtered list descending by date", async () => {
    const agent = await loginAdminAgent(app);
    const employee = await createEmployeeFixture("FT28-EMP");
    const { project } = await createProjectFixture("FT28-EMP-A");
    const { project: secondProject } = await createProjectFixture("FT28-EMP-B");

    const oldest = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-11-01",
      startTime: "09:00:00",
      employeeIds: [employee.id],
    });
    const middle = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-11-02",
      startTime: "08:00:00",
      employeeIds: [employee.id],
    });
    const newest = await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: "2099-11-03",
      startTime: "12:00:00",
      employeeIds: [employee.id],
    });

    await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: "2099-11-04",
      startTime: "12:00:00",
      employeeIds: [],
    });

    const response = await agent
      .get(`/api/appointments/list?employeeId=${employee.id}&page=1&pageSize=50`)
      .expect(200);

    const items = response.body.items as Array<{ id: number; employees: Array<{ id: number }> }>;
    expect(items.map((entry) => entry.id)).toEqual([newest.id, middle.id, oldest.id]);
    expect(items.every((entry) => entry.employees.some((assigned) => assigned.id === employee.id))).toBe(true);
  });
});

