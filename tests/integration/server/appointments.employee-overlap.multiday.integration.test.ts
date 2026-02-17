/**
 * Test Scope:
 *
 * Feature: FT01 - Mitarbeiter-Overlap in Mehrtagesterminen
 * Use Case: UC02 - Tour-/Team-/manuelle Zuweisung ueber mehrere Tage
 *
 * Abgedeckte Regeln:
 * - Overlap-Pruefung wird ueber jeden Tag der Terminspanne angewendet.
 * - Konflikt an einem einzelnen Tag blockiert den Mitarbeiter vollstaendig.
 * - Konfliktmeldung nennt den blockierten Mitarbeiter explizit.
 *
 * Fehlerfaelle:
 * - Partielle Zuweisung trotz Konflikt an nur einem Tag.
 * - Konfliktmeldung ohne betroffenen Mitarbeiter.
 *
 * Ziel:
 * Soll-Verhalten fuer Mehrtagestermine in allen drei Grundpfaden absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
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
  await resetDatabase();
  resetAppointmentOverlapFixtureCounters();
});

describe("FT01 integration: employee overlap multiday scenarios", () => {
  it("multiday + tour: employee blocked when conflict exists on one day in span", async () => {
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
    expect(target).toBeDefined();

    const assigned = await getAppointmentEmployeeIds(target.id as number);
    expect(assigned).toEqual([employeeE.id]);
  });

  it("multiday + team: one-day conflict blocks employee for entire assignment", async () => {
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
    expect(assigned).toEqual([employeeF.id]);
  });

  it("multiday + manual assignment: conflicting employee is not partially assigned", async () => {
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
});
