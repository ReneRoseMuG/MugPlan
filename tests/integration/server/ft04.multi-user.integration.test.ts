/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Optimistic Locking bei Tour-Update ueber Versionsnummer.
 * - Stale Edit nach Loeschen in anderer Session wird deterministisch abgewiesen.
 * - Parallele Kaskaden-Add-Requests bleiben fuer dieselbe Terminzuordnung konfliktfrei dedupliziert.
 *
 * Fehlerfaelle:
 * - Parallelrequests mit identischer Version koennen VERSION_CONFLICT erzeugen.
 * - Gleichzeitig ausgefuehrte Kaskaden erzeugen doppelte appointment_employee-Paare.
 *
 * Ziel:
 * Tatsaechliches Multi-User-Verhalten fuer FT04 nach dem neuen Kaskadenmodell erfassen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";

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
    // no local counters required
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createTour(agent: SuperAgentTest, color: string) {
  const response = await agent.post("/api/tours").send({ color }).expect(201);
  return response.body as { id: number; name: string; version: number };
}

describe("FT04 integration: MultiUserTests", () => {
  it("handles simultaneous updates on same tour with one success and one conflict", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const created = await createTour(sessionA, "#101010");

    const [resA, resB] = await Promise.all([
      sessionA.patch(`/api/tours/${created.id}`).send({ name: "Nordtour", color: "#202020", version: created.version }),
      sessionB.patch(`/api/tours/${created.id}`).send({ name: "Suedtour", color: "#303030", version: created.version }),
    ]);

    const statuses = [resA.status, resB.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
  });

  it("documents stale edit after delete in another session", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const created = await createTour(sessionA, "#666666");

    await sessionB.delete(`/api/tours/${created.id}`).send({ version: created.version }).expect(204);

    await sessionA
      .patch(`/api/tours/${created.id}`)
      .send({ name: created.name, color: "#777777", version: created.version })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe("NOT_FOUND");
      });
  });

  it("keeps concurrent cascade add requests deduplicated on the appointment", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tour = await createTourFixture("#888888");
    const employee = await createEmployeeFixture("FT04-MULTI");
    const project = await createProjectFixture({ prefix: "FT04-MULTI" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });

    const [resA, resB] = await Promise.all([
      sessionA
        .post(`/api/tours/${tour.id}/employees/cascade-add`)
        .send({ employeeId: employee.id, selectedAppointmentIds: [appointment!.id] }),
      sessionB
        .post(`/api/tours/${tour.id}/employees/cascade-add`)
        .send({ employeeId: employee.id, selectedAppointmentIds: [appointment!.id] }),
    ]);

    const statuses = [resA.status, resB.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 200]);
    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([employee.id]);
  });
});
