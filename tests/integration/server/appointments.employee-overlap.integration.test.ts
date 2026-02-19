/**
 * Test Scope:
 *
 * Feature: FT01 - Mitarbeiter-Overlap in Terminzuweisungen
 * Use Case: UC01 - Tour-/Team-/manuelle Mitarbeiteruebernahme mit Konfliktpruefung
 *
 * Abgedeckte Regeln:
 * - Tour-Vorbelegung meldet konfliktierende Mitarbeiter explizit und bricht den Save ohne Persistierung ab.
 * - Team-Zuweisung meldet konfliktierende Mitarbeiter explizit und bricht den Save ohne Persistierung ab.
 * - Manuelle Zuweisung meldet konfliktierende Mitarbeiter explizit und verhindert Persistierung.
 * - Join-Tabelle enthaelt keine doppelten appointment/employee-Paare.
 *
 * Fehlerfaelle:
 * - Konfliktpayload ohne konfliktierende Mitarbeiter.
 * - Termin-/Join-Daten werden trotz Konflikt teilweise persistiert.
 *
 * Ziel:
 * Soll-Verhalten der Konfliktbehandlung fuer die drei Grundszenarien deterministisch absichern.
 */
import express from "express";
import { createServer } from "http";
import request from "supertest";
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

describe("FT01 integration: employee overlap base scenarios", () => {
  it("Case 1: tour prefill reports conflicting employee and does not persist create", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("TOUR-BASE");

    const employeeA = await createEmployeeFixture("A");
    const employeeX = await createEmployeeFixture("X");
    const tour = await createTourFixture();
    await assignEmployeesToTourFixture(tour.id, [employeeA, employeeX]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-01",
      employeeIds: [employeeA.id],
    });

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2099-05-01",
      tourId: tour.id,
      employeeIds: [employeeA.id, employeeX.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeA.id, fullName: employeeA.fullName }]);

    const listResponse = await agent.get(`/api/projects/${project.id}/appointments?fromDate=2099-05-01`).expect(200);
    const created = listResponse.body.find((entry: { startDate: string; tourId: number | null }) => (
      entry.startDate === "2099-05-01" && entry.tourId === tour.id
    ));

    expect(created).toBeUndefined();

    await assertNoDuplicateAppointmentEmployeePairs();
  });

  it("Case 2: team assignment reports conflicting employee and keeps pre-update assignment unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("TEAM-BASE");

    const employeeB = await createEmployeeFixture("B");
    const employeeY = await createEmployeeFixture("Y");
    const team = await createTeamFixture();
    await assignEmployeesToTeamFixture(team.id, [employeeB, employeeY]);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-02",
      employeeIds: [employeeB.id],
    });

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-02",
      employeeIds: [],
    });

    const response = await agent.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: project.id,
      startDate: "2099-05-02",
      employeeIds: [employeeB.id, employeeY.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeB.id, fullName: employeeB.fullName }]);

    const assignmentIds = await getAppointmentEmployeeIds(existing.id);
    expect(assignmentIds).toEqual([]);

    await assertNoDuplicateAppointmentEmployeePairs();
  });

  it("Case 3: manual employee assignment reports conflict and leaves assignment unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("MANUAL-BASE");

    const employeeC = await createEmployeeFixture("C");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-03",
      employeeIds: [employeeC.id],
    });

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-05-03",
      employeeIds: [],
    });

    const response = await agent.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: project.id,
      startDate: "2099-05-03",
      employeeIds: [employeeC.id],
    });

    expect(response.status).toBe(409);
    expectConflictPayloadContainsEmployees(response.body, [{ id: employeeC.id, fullName: employeeC.fullName }]);

    const assignmentIds = await getAppointmentEmployeeIds(existing.id);
    expect(assignmentIds).toEqual([]);

    await assertNoDuplicateAppointmentEmployeePairs();
  });
});
