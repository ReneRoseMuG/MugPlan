/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine rollenabhängig schützen
 * Use Case: UC04 - API-Schutz gegen Erstellung/Bearbeitung in der Vergangenheit
 *
 * Abgedeckte Regeln:
 * - Create mit Datum in der Vergangenheit wird für Disponenten serverseitig blockiert.
 * - Admins dürfen historische Termine mutieren.
 * - Datum=heute mit Startzeit in der Vergangenheit wird für Disponenten serverseitig blockiert.
 * - Bei Blockierung erfolgt keine Persistierung.
 * - Disponenten dürfen historische Termine löschen (Admin ebenfalls).
 * - Disponenten dürfen historische Termine weiterhin nicht ändern.
 * - Stornierte historische Termine bleiben auch für Disponenten unlöschbar.
 *
 * Fehlerfaelle:
 * - Historischer Termin wird für Disponenten trotz Verbots angelegt.
 * - Historischer Termin wird für Admins fälschlich blockiert.
 * - Disponent kann historischen Termin trotz Erlaubnis nicht löschen.
 * - Disponent kann historischen Termin entgegen der Sperre ändern.
 * - Stornierter historischer Termin wird trotz Storno-Sperre gelöscht.
 *
 * Ziel:
 * Soll-Regeln fuer Historien-Schutz auf API-Ebene deterministisch absichern.
 */
import type express from "express";
import type { SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getBerlinTodayDateString } from "../../../client/src/lib/project-appointments";
import { db } from "../../../server/db";
import { appointments } from "@shared/schema";
import { createApiTestApp, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createProjectFixture,
  loginAdminAgent,
  resetAppointmentOverlapFixtureCounters,
} from "../../helpers/appointmentOverlapFixtures";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { applySystemSeed } from "../../../server/services/systemSeedService";

let app: express.Express;
let dispatcherCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(async () => {
  resetAppointmentOverlapFixtureCounters();
});

async function countProjectAppointments(agent: SuperAgentTest, projectId: number): Promise<number> {
  const response = await agent.get(`/api/projects/${projectId}/appointments?fromDate=1900-01-01`).expect(200);
  return response.body.length as number;
}

async function loginDispatcherAgent(): Promise<SuperAgentTest> {
  const token = `hist-dispatcher-${dispatcherCounter}`;
  dispatcherCounter += 1;
  const username = `test-${token}`;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Dispatcher",
    passwordHash,
    roleCode: "DISPATCHER",
  });
  return loginAgent(app, { username, password });
}

describe("FT01 integration: historical appointment guards", () => {
  it("H5.1 blocks dispatcher create for past date and keeps persistence unchanged", async () => {
    const agent = await loginDispatcherAgent();
    const { project } = await createProjectFixture("HIST-CREATE-BLOCK");

    const beforeCount = await countProjectAppointments(agent, project.id);

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2000-01-01",
      employeeIds: [],
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "PAST_APPOINTMENT_READONLY" });

    const afterCount = await countProjectAppointments(agent, project.id);
    expect(afterCount).toBe(beforeCount);
  });

  it("H5.1a allows admin create for past date", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("HIST-CREATE-ADMIN");

    const beforeCount = await countProjectAppointments(agent, project.id);

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2000-01-01",
      employeeIds: [],
    }).expect(201);

    expect(response.body).toMatchObject({
      projectId: project.id,
    });
    expect(response.body.startDate).toContain("2000-01-01");

    const afterCount = await countProjectAppointments(agent, project.id);
    expect(afterCount).toBe(beforeCount + 1);
  });

  it("H5.2 allows admin update for existing appointment in the past", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("HIST-UPDATE");

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-02",
      employeeIds: [],
    });
    await db.update(appointments).set({ startDate: new Date("2000-01-02T00:00:00") }).where(eq(appointments.id, existing.id));

    const response = await agent.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: null,
      customerId: project.customerId,
      startDate: "2000-01-03",
      employeeIds: [],
    }).expect(200);

    const reloaded = await agent.get(`/api/appointments/${existing.id}`).expect(200);
    expect(response.body.startDate).toContain("2000-01-03");
    expect(reloaded.body).toMatchObject({
      startDate: "2000-01-03",
      projectId: null,
      customerId: project.customerId,
    });
  });

  it("H5.3 blocks dispatcher today date with startTime in the past", async () => {
    const agent = await loginDispatcherAgent();
    const { project } = await createProjectFixture("HIST-TIME");
    const today = getBerlinTodayDateString();

    const response = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: today,
      startTime: "00:00:00",
      employeeIds: [],
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("H5.4 allows dispatcher delete for historical appointment and removes it", async () => {
    const agent = await loginDispatcherAgent();
    const { project } = await createProjectFixture("HIST-DELETE-DISP");

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-05",
      employeeIds: [],
    });
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-05T00:00:00") })
      .where(eq(appointments.id, existing.id));

    const beforeCount = await countProjectAppointments(agent, project.id);

    await agent
      .delete(`/api/appointments/${existing.id}`)
      .send({ version: existing.version })
      .expect(204);

    const afterCount = await countProjectAppointments(agent, project.id);
    expect(afterCount).toBe(beforeCount - 1);

    const rows = await db.select().from(appointments).where(eq(appointments.id, existing.id));
    expect(rows).toHaveLength(0);
  });

  it("H5.5 allows admin delete for historical appointment and removes it", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("HIST-DELETE-ADMIN");

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-06",
      employeeIds: [],
    });
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-06T00:00:00") })
      .where(eq(appointments.id, existing.id));

    await agent
      .delete(`/api/appointments/${existing.id}`)
      .send({ version: existing.version })
      .expect(204);

    const rows = await db.select().from(appointments).where(eq(appointments.id, existing.id));
    expect(rows).toHaveLength(0);
  });

  it("H5.6 still blocks dispatcher update for historical appointment", async () => {
    const agent = await loginDispatcherAgent();
    const { project } = await createProjectFixture("HIST-UPDATE-DISP-BLOCK");

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-07",
      employeeIds: [],
    });
    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-07T00:00:00") })
      .where(eq(appointments.id, existing.id));

    const response = await agent.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: null,
      customerId: project.customerId,
      startDate: "2000-01-08",
      employeeIds: [],
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "PAST_APPOINTMENT_READONLY" });

    const rows = await db.select().from(appointments).where(eq(appointments.id, existing.id));
    expect(rows).toHaveLength(1);
  });

  it("H5.7 keeps cancelled historical appointment undeletable for dispatcher", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await loginDispatcherAgent();
    await applySystemSeed();

    const { project } = await createProjectFixture("HIST-DELETE-CANCELLED");
    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-01-09",
      employeeIds: [],
    });

    await admin
      .post(`/api/appointments/${existing.id}/cancel`)
      .send({ version: existing.version })
      .expect(204);

    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-09T00:00:00") })
      .where(eq(appointments.id, existing.id));

    const detail = await dispatcher.get(`/api/appointments/${existing.id}`).expect(200);

    const response = await dispatcher
      .delete(`/api/appointments/${existing.id}`)
      .send({ version: detail.body.version });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "CANCELLED_APPOINTMENT_READONLY" });

    const rows = await db.select().from(appointments).where(eq(appointments.id, existing.id));
    expect(rows).toHaveLength(1);
  });
});
