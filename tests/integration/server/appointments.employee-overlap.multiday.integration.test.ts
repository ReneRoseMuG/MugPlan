/**
 * Test Scope:
 *
 * Feature: FT01 - Mitarbeiter-Overlap in Mehrtagesterminen
 * Use Case: UC02 - Tour-/Team-/manuelle Zuweisung ueber mehrere Tage
 *
 * Abgedeckte Regeln:
 * - Overlap-Pruefung wird ueber jeden Tag der Terminspanne angewendet.
 * - Konflikt an einem einzelnen Tag blockiert den Save vollstaendig.
 * - Zeitgebundene Konflikte entstehen nur bei gleicher Stunde.
 * - Konfliktmeldung nennt den blockierten Mitarbeiter explizit.
 *
 * Fehlerfaelle:
 * - Partielle Persistierung trotz Konflikt an nur einem Tag.
 * - Konfliktmeldung ohne betroffenen Mitarbeiter.
 *
 * Ziel:
 * Soll-Verhalten fuer Mehrtagestermine in allen drei Grundpfaden absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import {
  assignEmployeesToTeamFixture,
  assignEmployeesToTourFixture,
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
  expectConflictPayloadContainsEmployees,
  getAppointmentEmployeeIds,
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

beforeEach(async () => {
  resetAppointmentOverlapFixtureCounters();
});

describe("FT01 integration: employee overlap multiday scenarios", () => {
  it("multiday + tour: overlap blocks create completely when conflict exists on one day in span", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MULTI-TOUR");

    const employeeD = await createEmployeeFixture("D");
    const employeeE = await createEmployeeFixture("E");
    const tour = await createTourFixture("#8844aa");
    await assignEmployeesToTourFixture(tour.id, [employeeD, employeeE]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-03",
      endDate: "2099-06-03",
      employeeIds: [employeeD.id],
    });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2099-06-01",
      endDate: "2099-06-05",
      tourId: tour.id,
      employeeIds: [employeeD.id, employeeE.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeD.id, fullName: employeeD.fullName }]);

    const listResponse = await agent.get(`/api/projects/${project.id}/appointments?fromDate=2099-06-01`).expect(200);
    const target = listResponse.body.find((entry: { startDate: string; endDate: string | null }) => (
      entry.startDate === "2099-06-01" && entry.endDate === "2099-06-05"
    ));
    expect(target).toBeUndefined();
  });

  it("multiday + team: one-day conflict keeps existing assignment unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MULTI-TEAM");

    const employeeD = await createEmployeeFixture("D2");
    const employeeF = await createEmployeeFixture("F");
    const team = await createTeamFixture("#3366cc");
    await assignEmployeesToTeamFixture(team.id, [employeeD, employeeF]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-04",
      employeeIds: [employeeD.id],
    });

    const base = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-02",
      endDate: "2099-06-06",
      employeeIds: [],
    });

    const response = await agent.patch(`/api/appointments/${base.id}`).send({
      version: base.version,
      projectId: project.id,
      startDate: "2099-06-02",
      endDate: "2099-06-06",
      employeeIds: [employeeD.id, employeeF.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeD.id, fullName: employeeD.fullName }]);

    const assigned = await getAppointmentEmployeeIds(base.id);
    expect(assigned).toEqual([]);
  });

  it("multiday + manual assignment: conflict keeps existing assignment unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MULTI-MANUAL");

    const employeeD = await createEmployeeFixture("D3");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-05",
      employeeIds: [employeeD.id],
    });

    const base = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-04",
      endDate: "2099-06-07",
      employeeIds: [],
    });

    const response = await agent.patch(`/api/appointments/${base.id}`).send({
      version: base.version,
      projectId: project.id,
      startDate: "2099-06-04",
      endDate: "2099-06-07",
      employeeIds: [employeeD.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeD.id, fullName: employeeD.fullName }]);

    const assigned = await getAppointmentEmployeeIds(base.id);
    expect(assigned).toEqual([]);
  });

  it("multiday timed: overlap day with different hour is allowed", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MULTI-TIME-ALLOW");
    const employee = await createEmployeeFixture("T1");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-08",
      startTime: "11:00:00",
      employeeIds: [employee.id],
    });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2099-06-06",
      endDate: "2099-06-09",
      startTime: "10:00:00",
      employeeIds: [employee.id],
    });

    expect(response.status).toBe(201);
  });

  it("multiday timed: overlap day with equal hour is blocked", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MULTI-TIME-BLOCK");
    const employee = await createEmployeeFixture("T2");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-10",
      startTime: "10:05:00",
      employeeIds: [employee.id],
    });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2099-06-09",
      endDate: "2099-06-12",
      startTime: "10:59:00",
      employeeIds: [employee.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employee.id, fullName: employee.fullName }]);
  });
});
