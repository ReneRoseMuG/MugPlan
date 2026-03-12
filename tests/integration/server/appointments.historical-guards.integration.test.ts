/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 * Use Case: UC04 - API-Schutz gegen Erstellung/Bearbeitung in der Vergangenheit
 *
 * Abgedeckte Regeln:
 * - Create mit Datum in der Vergangenheit wird serverseitig blockiert.
 * - Update eines historischen Termins wird serverseitig blockiert.
 * - Datum=heute mit Startzeit in der Vergangenheit wird serverseitig blockiert.
 * - Bei Blockierung erfolgt keine Persistierung.
 *
 * Fehlerfaelle:
 * - Historischer Termin wird trotz Verbots angelegt.
 * - Historischer Termin wird trotz Verbots veraendert.
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
import { createApiTestApp } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createProjectFixture,
  loginAdminAgent,
  resetAppointmentOverlapFixtureCounters,
} from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

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

describe("FT01 integration: historical appointment guards", () => {
  it("H5.1 blocks create for past date and keeps persistence unchanged", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("HIST-CREATE");

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

  it("H5.2 blocks update for existing appointment in the past", async () => {
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
      projectId: project.id,
      startDate: "2000-01-03",
      employeeIds: [],
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "PAST_APPOINTMENT_READONLY" });

    const reloaded = await agent.get(`/api/appointments/${existing.id}`).expect(200);
    expect(reloaded.body.startDate).toBe("2000-01-02");
  });

  it("H5.3 blocks today date with startTime in the past", async () => {
    const agent = await loginAdminAgent(app);
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
});
