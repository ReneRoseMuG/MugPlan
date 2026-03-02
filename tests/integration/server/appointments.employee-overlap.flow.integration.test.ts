/**
 * Test Scope:
 *
 * Feature: FT01 - Mitarbeiter-Overlap in Folgeoperationen
 * Use Case: UC03 - Tour nachtraeglich setzen, entfernen, wechseln sowie Team/manuelle Zuweisung
 *
 * Abgedeckte Regeln:
 * - Nachtraegliche Tour-Zuweisung darf keine unzulaessige Doppelverplanung erzeugen und persistiert bei Konflikt nichts.
 * - Tour-Entfernung und Tour-Wechsel bleiben join-konsistent.
 * - Team- und manuelle Zuweisung werden durch dieselbe Join-Konfliktlogik abgesichert.
 * - Zeitgebundene Termine in unterschiedlichen Stunden bleiben konfliktfrei.
 * - appointment_employee enthaelt keine doppelten Zuordnungen.
 *
 * Fehlerfaelle:
 * - Doppelte Mitarbeiterzuordnung in der Join-Tabelle.
 * - Konfliktierende Mitarbeiter werden trotz Konflikt persistiert.
 *
 * Ziel:
 * Soll-Verhalten fuer sequenzielle Aenderungspfade deterministisch absichern.
 */
import express from "express";
import { createServer } from "http";
import type { SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import {
  assertNoDuplicateAppointmentEmployeePairs,
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

async function loadAppointmentVersion(agent: SuperAgentTest, appointmentId: number) {
  const details = await agent.get(`/api/appointments/${appointmentId}`).expect(200);
  return Number(details.body.version);
}

describe("FT01 integration: employee overlap follow-up flows", () => {
  it("keeps join operation conflict-safe across tour/team/manual sequence", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("FLOW");

    const employeeA = await createEmployeeFixture("FLOW-A");
    const employeeB = await createEmployeeFixture("FLOW-B");
    const employeeC = await createEmployeeFixture("FLOW-C");

    const tourOne = await createTourFixture("#117733");
    const tourTwo = await createTourFixture("#993355");
    const teamOne = await createTeamFixture("#3355aa");

    await assignEmployeesToTourFixture(tourOne.id, [employeeA, employeeB]);
    await assignEmployeesToTourFixture(tourTwo.id, [employeeB, employeeC]);
    await assignEmployeesToTeamFixture(teamOne.id, [employeeA, employeeC]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-07-01",
      employeeIds: [employeeA.id],
    });

    const base = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-07-01",
      employeeIds: [],
    });

    const setTourOne = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: tourOne.id,
      employeeIds: [employeeA.id, employeeB.id],
    });

    expect(setTourOne.status).toBe(409);
    expectConflictPayloadContainsEmployees(setTourOne.body, [{ id: employeeA.id }]);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([]);

    const removeTour = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: null,
      employeeIds: [],
    });

    expect(removeTour.status).toBe(200);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([]);

    const switchTour = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: tourTwo.id,
      employeeIds: [employeeB.id, employeeC.id],
    });

    expect(switchTour.status).toBe(200);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([employeeB.id, employeeC.id]);

    const assignTeam = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: tourTwo.id,
      employeeIds: [employeeA.id, employeeB.id, employeeC.id],
    });

    expect(assignTeam.status).toBe(409);
    expectConflictPayloadContainsEmployees(assignTeam.body, [{ id: employeeA.id }]);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([employeeB.id, employeeC.id]);

    const addManual = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-07-01",
      tourId: tourTwo.id,
      employeeIds: [employeeA.id, employeeB.id, employeeC.id],
    });

    expect(addManual.status).toBe(409);
    expectConflictPayloadContainsEmployees(addManual.body, [{ id: employeeA.id }]);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([employeeB.id, employeeC.id]);

    await assertNoDuplicateAppointmentEmployeePairs();
  });

  it("allows second save after reverting endDate when previous overlap update failed", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("FLOW-RETRY");

    const employeeA = await createEmployeeFixture("FLOW-RETRY-A");
    const employeeB = await createEmployeeFixture("FLOW-RETRY-B");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-11",
      employeeIds: [employeeB.id],
    });

    const base = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-10",
      endDate: "2099-08-10",
      employeeIds: [employeeA.id, employeeB.id],
    });

    const firstTry = await agent.patch(`/api/appointments/${base.id}`).send({
      version: base.version,
      projectId: project.id,
      startDate: "2099-08-10",
      endDate: "2099-08-11",
      employeeIds: [employeeA.id, employeeB.id],
    });

    expect(firstTry.status).toBe(409);
    expectConflictPayloadContainsEmployees(firstTry.body, [{ id: employeeB.id }]);

    const secondTry = await agent.patch(`/api/appointments/${base.id}`).send({
      version: base.version,
      projectId: project.id,
      startDate: "2099-08-10",
      endDate: "2099-08-10",
      employeeIds: [employeeA.id, employeeB.id],
    });

    expect(secondTry.status).toBe(200);
    expect(secondTry.body.version).toBe(base.version + 1);
    const assigned = await getAppointmentEmployeeIds(base.id);
    expect(assigned).toEqual([employeeA.id, employeeB.id]);
  });

  it("allows follow-up update when target hour differs from existing timed assignment", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("FLOW-TIME");
    const employee = await createEmployeeFixture("FLOW-TIME-E");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-20",
      startTime: "09:00:00",
      employeeIds: [employee.id],
    });

    const base = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-20",
      startTime: "10:00:00",
      employeeIds: [],
    });

    const update = await agent.patch(`/api/appointments/${base.id}`).send({
      version: await loadAppointmentVersion(agent, base.id),
      projectId: project.id,
      startDate: "2099-08-20",
      startTime: "10:30:00",
      employeeIds: [employee.id],
    });

    expect(update.status).toBe(200);
    expect(await getAppointmentEmployeeIds(base.id)).toEqual([employee.id]);
  });
});
