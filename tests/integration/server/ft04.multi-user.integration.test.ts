/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Gleichzeitige Bearbeitung in mehreren Sessions
 *
 * Abgedeckte Regeln:
 * - Optimistic Locking bei Tour-Update ueber Versionsnummer.
 * - Konkurrenz bei Mitarbeiter-Tour-Mutationen fuehrt zu einem Gewinner und Konflikt fuer den Verlierer.
 * - Loeschen waehrend paralleler Bearbeitung wird mit stale Version serverseitig deterministisch beantwortet.
 *
 * Fehlerfaelle:
 * - Parallelrequests mit identischer Version koennen VERSION_CONFLICT erzeugen.
 *
 * Ziel:
 * Tatsaechtliches Multi-User-Verhalten fuer FT04 ohne Annahmen erfassen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";

let app: express.Express;
let employeeCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  employeeCounter = 1;
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

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: `Multi-${idx}`,
      lastName: `User-${idx}`,
      phone: null,
      email: null,
    })
    .expect(201);
  return response.body as { id: number; version: number };
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

    const statuses = [resA.status, resB.status].sort((l, r) => l - r);
    expect(statuses).toEqual([200, 409]);
  });

  it("handles concurrent employee remove and reassign with version conflict", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tourA = await createTour(sessionA, "#444444");
    const tourB = await createTour(sessionA, "#555555");
    const employee = await createEmployee(sessionA);

    const assigned = await sessionA
      .post(`/api/tours/${tourA.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    const currentVersion = assigned.body[0].version as number;

    const [removeRes, assignRes] = await Promise.all([
      sessionA.delete(`/api/tours/${tourA.id}/employees/${employee.id}`).send({ version: currentVersion }),
      sessionB
        .post(`/api/tours/${tourB.id}/employees`)
        .send({ items: [{ employeeId: employee.id, version: currentVersion }] }),
    ]);

    const statuses = [removeRes.status, assignRes.status].sort((l, r) => l - r);
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

  it("documents optimistic locking response for stale employee assignment version", async () => {
    const sessionA = await loginAdminAgent();
    const sessionB = await loginAdminAgent();
    const tour = await createTour(sessionA, "#888888");
    const employee = await createEmployee(sessionA);

    await sessionA
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    await sessionB
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });
});
