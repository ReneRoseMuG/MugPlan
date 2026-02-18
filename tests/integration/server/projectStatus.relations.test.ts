/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus zu Projekt zuordnen / UC Projektstatus entfernen
 *
 * Abgedeckte Regeln:
 * - Inaktive Status duerfen nicht neu zugeordnet werden.
 * - Add erfordert expectedVersion und liefert relationVersion.
 * - Entfernen erfordert die passende relationVersion.
 * - Entfernen einer nicht vorhandenen Zuordnung liefert NOT_FOUND.
 *
 * Fehlerfaelle:
 * - Add mit inaktivem Status liefert BUSINESS_CONFLICT.
 * - Add bei bestehender Relation liefert VERSION_CONFLICT.
 * - Remove mit falscher Version liefert VERSION_CONFLICT.
 * - Remove ohne existierende Relation liefert NOT_FOUND.
 *
 * Ziel:
 * Sicherstellen, dass die FT15-Zuordnungslogik serverseitig korrekt mit relation-basiertem Optimistic Locking umgesetzt ist.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";

let app: express.Express;
let customerCounter = 1;

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
  customerCounter = 1;
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createProjectForTest() {
  const customer = await customersService.createCustomer({
    customerNumber: `REL-${customerCounter}`,
    firstName: "Rel",
    lastName: `Customer-${customerCounter}`,
    fullName: `Customer-${customerCounter}, Rel`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  customerCounter += 1;
  return projectsService.createProject({
    name: `RelProjekt-${customerCounter}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT15 integration: project status relations", () => {
  it("blocks add relation for inactive status", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Inaktiv", color: "#64748b", description: null, sortOrder: 1 })
      .expect(201);

    await agent
      .patch(`/api/project-status/${created.body.id}/active`)
      .send({ isActive: false, version: created.body.version })
      .expect(200);

    await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: created.body.id, expectedVersion: 0 })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("adds relation with expectedVersion=0 and blocks second add with VERSION_CONFLICT", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Aktiv", color: "#16a34a", description: null, sortOrder: 1 })
      .expect(201);

    const addResponse = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: created.body.id, expectedVersion: 0 })
      .expect(201);
    expect(addResponse.body.relationVersion).toBe(1);
    expect(addResponse.body.status.id).toBe(created.body.id);

    await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: created.body.id, expectedVersion: 0 })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("removes existing relation with matching version and blocks stale version", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Aktiv", color: "#16a34a", description: null, sortOrder: 1 })
      .expect(201);

    const addResponse = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: created.body.id, expectedVersion: 0 })
      .expect(201);

    await agent
      .delete(`/api/projects/${project.id}/statuses/${created.body.id}`)
      .send({ version: addResponse.body.relationVersion + 1 })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });

    await agent
      .delete(`/api/projects/${project.id}/statuses/${created.body.id}`)
      .send({ version: addResponse.body.relationVersion })
      .expect(204);
  });

  it("returns NOT_FOUND when removing non-existing relation", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "X", color: "#f97316", description: null, sortOrder: 1 })
      .expect(201);

    await agent
      .delete(`/api/projects/${project.id}/statuses/${created.body.id}`)
      .send({ version: 1 })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe("NOT_FOUND");
      });
  });
});
