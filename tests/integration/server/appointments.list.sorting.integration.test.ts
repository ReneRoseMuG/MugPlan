/**
 * Test Scope:
 *
 * Feature: FT28 – Terminliste Sortierung in Tour-/Mitarbeiter-Formular
 * Use Case: UC Terminliste standardmaessig aufsteigend nach Datum
 *
 * Abgedeckte Regeln:
 * - /api/appointments/list liefert im Tour-Kontext standardmaessig aufsteigend nach Datum/Zeit/ID.
 * - /api/appointments/list liefert im Mitarbeiter-Kontext standardmaessig aufsteigend nach Datum.
 * - /api/appointments/list filtert optional ueber Auftragsnummer per Teiltreffer.
 * - availableRange ignoriert aktive Datumseinschraenkungen und beschreibt weiter die volle Basismenge.
 *
 * Fehlerfaelle:
 * - Liste wird nicht aufsteigend ausgeliefert.
 * - Filterkontext (tourId/employeeId) liefert Fremdtermine.
 * - Auftragsnummer-Filter schliesst gueltige Teiltreffer aus.
 * - availableRange wird auf den aktuell gefilterten Zeitraum zusammengestutzt.
 *
 * Ziel:
 * Serverseitigen Sortiervertrag der Formular-Terminlisten regressionssicher absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as projectsService from "../../../server/services/projectsService";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  loginAdminAgent,
  resetAppointmentOverlapFixtureCounters,
} from "../../helpers/appointmentOverlapFixtures";
import { createRawAppointmentFixture, getRelativeBerlinDate } from "../../helpers/testDataFactory";

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
  it("returns tour-filtered list ascending by date/time/id", async () => {
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
    expect(items.map((entry) => entry.id)).toEqual([older.id, sameDateEarlier.id, sameDateLater.id]);
    expect(items.every((entry) => entry.tourId === tour.id)).toBe(true);
    expect(response.body.focusAppointment).toEqual(expect.objectContaining({
      appointmentId: older.id,
      page: 1,
      indexOnPage: expect.any(Number),
      startDate: "2099-10-10",
      startTime: "09:00:00",
    }));
  });

  it("returns employee-filtered list ascending by date", async () => {
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
    expect(items.map((entry) => entry.id)).toEqual([oldest.id, middle.id, newest.id]);
    expect(items.every((entry) => entry.employees.some((assigned) => assigned.id === employee.id))).toBe(true);
    expect(response.body.focusAppointment).toEqual(expect.objectContaining({
      appointmentId: oldest.id,
      page: 1,
      indexOnPage: expect.any(Number),
      startDate: "2099-11-01",
      startTime: "09:00:00",
    }));
    expect(response.body.availableRange).toEqual({
      dateFrom: "2099-11-01",
      dateTo: "2099-11-03",
    });
  });

  it("filters list by orderNumber using partial matches", async () => {
    const agent = await loginAdminAgent(app);
    const { project: targetProject } = await createProjectFixture("FT28-ORD-TARGET");
    const { project: nonTargetProject } = await createProjectFixture("FT28-ORD-OTHER");

    const updatedTargetProject = await projectsService.updateProject(targetProject.id, {
      version: targetProject.version,
      orderNumber: "AUF-123-XYZ",
    });
    expect(updatedTargetProject).not.toBeNull();

    const updatedNonTargetProject = await projectsService.updateProject(nonTargetProject.id, {
      version: nonTargetProject.version,
      orderNumber: "BST-999",
    });
    expect(updatedNonTargetProject).not.toBeNull();

    const matching = await createAppointmentFixture({
      projectId: targetProject.id,
      startDate: "2099-12-01",
      startTime: "09:00:00",
      employeeIds: [],
    });
    await createAppointmentFixture({
      projectId: nonTargetProject.id,
      startDate: "2099-12-02",
      startTime: "10:00:00",
      employeeIds: [],
    });

    const matchResponse = await agent
      .get("/api/appointments/list?orderNumber=123&page=1&pageSize=50")
      .expect(200);
    const matchItems = matchResponse.body.items as Array<{ id: number; projectOrderNumber: string | null }>;
    expect(matchItems.map((entry) => entry.id)).toEqual([matching.id]);
    expect(matchItems[0]?.projectOrderNumber).toBe("AUF-123-XYZ");

    const noMatchResponse = await agent
      .get("/api/appointments/list?orderNumber=NOPE&page=1&pageSize=50")
      .expect(200);
    const noMatchItems = noMatchResponse.body.items as Array<{ id: number }>;
    expect(noMatchItems).toHaveLength(0);
  });

  it("keeps availableRange on the full base set when date filters narrow the visible rows", async () => {
    const agent = await loginAdminAgent(app);
    const tour = await createTourFixture("#1188aa");
    const { project } = await createProjectFixture("FT28-RANGE-A");
    const { project: secondProject } = await createProjectFixture("FT28-RANGE-B");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-01",
      startTime: "08:00:00",
      tourId: tour.id,
      employeeIds: [],
    });
    const visible = await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: "2099-08-15",
      startTime: "10:00:00",
      tourId: tour.id,
      employeeIds: [],
    });

    const response = await agent
      .get(`/api/appointments/list?tourId=${tour.id}&dateFrom=2099-08-10&dateTo=2099-08-20&page=1&pageSize=50`)
      .expect(200);

    const items = response.body.items as Array<{ id: number }>;
    expect(items.map((entry) => entry.id)).toEqual([visible.id]);
    expect(response.body.availableRange).toEqual({
      dateFrom: "2099-08-01",
      dateTo: "2099-08-15",
    });
    expect(response.body.focusAppointment).toEqual(expect.objectContaining({
      appointmentId: visible.id,
      page: 1,
      indexOnPage: expect.any(Number),
      startDate: "2099-08-15",
      startTime: "10:00:00",
    }));
  });

  it("returns the focus appointment page for mixed historical and future rows across a page boundary", async () => {
    const agent = await loginAdminAgent(app);
    const tour = await createTourFixture("#3366aa");
    const { project } = await createProjectFixture("FT28-FOCUS-PAGE");
    const tomorrowAppointmentDate = getRelativeBerlinDate(1);
    const expectedFocusIds: number[] = [];

    for (let index = 0; index < 25; index += 1) {
      const appointmentId = await createRawAppointmentFixture({
        projectId: project.id,
        startDate: `2000-01-${String(index + 1).padStart(2, "0")}`,
        title: `FT28 focus historic ${index + 1}`,
        tourId: tour.id,
      });
      expectedFocusIds.push(appointmentId);
    }

    const focusAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: tomorrowAppointmentDate,
      tourId: tour.id,
      employeeIds: [],
    });

    const response = await agent
      .get(`/api/appointments/list?tourId=${tour.id}&page=1&pageSize=25`)
      .expect(200);

    const items = response.body.items as Array<{ id: number }>;
    expect(items.map((entry) => entry.id)).toEqual(expectedFocusIds);
    expect(response.body.focusAppointment).toEqual(expect.objectContaining({
      appointmentId: focusAppointment.id,
      page: 2,
      indexOnPage: expect.any(Number),
      startDate: tomorrowAppointmentDate,
      startTime: null,
    }));
  });

  it("omits focus metadata when only historical rows remain after filtering", async () => {
    const agent = await loginAdminAgent(app);
    const employee = await createEmployeeFixture("FT28-FOCUS-PAST");
    const { project } = await createProjectFixture("FT28-FOCUS-PAST");

    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: "2001-04-01",
      title: "FT28 focus only past 1",
      employeeIds: [employee.id],
    });
    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: "2001-04-02",
      title: "FT28 focus only past 2",
      employeeIds: [employee.id],
    });

    const response = await agent
      .get(`/api/appointments/list?employeeId=${employee.id}&page=1&pageSize=25`)
      .expect(200);

    expect(response.body.focusAppointment).toBeNull();
  });

  it("prefers a same-day appointment over later future appointments and keeps availableRange unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("FT28-FOCUS-TODAY");
    const todayAppointmentDate = getRelativeBerlinDate(0);
    const futureAppointmentDate = getRelativeBerlinDate(2);

    const todayAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: todayAppointmentDate,
      employeeIds: [],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: futureAppointmentDate,
      startTime: "08:00:00",
      employeeIds: [],
    });

    const response = await agent
      .get(`/api/appointments/list?projectTitle=${encodeURIComponent(project.name)}&page=1&pageSize=25`)
      .expect(200);

    expect(response.body.focusAppointment).toEqual(expect.objectContaining({
      appointmentId: todayAppointment.id,
      page: 1,
      indexOnPage: expect.any(Number),
      startDate: todayAppointmentDate,
      startTime: null,
    }));
    expect(response.body.availableRange).toEqual({
      dateFrom: todayAppointmentDate,
      dateTo: futureAppointmentDate,
    });
  });
});
