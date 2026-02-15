/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus verwalten / UC Projektstatus deaktivieren / UC Projektstatus loeschen
 *
 * Abgedeckte Regeln:
 * - Update/Toggle/Delete erfordern gueltige Versionsangaben fuer Projektstatus-Stammdaten.
 * - Loeschen ist blockiert, wenn ein Status verwendet wird.
 * - Loeschen ist blockiert, wenn ein Status als Default geschuetzt ist.
 *
 * Fehlerfaelle:
 * - Update ohne Version liefert VALIDATION_ERROR.
 * - Update mit veralteter/falscher Version liefert VERSION_CONFLICT.
 * - Delete bei Verwendung oder Default liefert BUSINESS_CONFLICT.
 *
 * Ziel:
 * End-to-end-artige API-Absicherung der zentralen FT15-Lifecycle-Regeln auf Serverebene.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as projectStatusService from "../../../server/services/projectStatusService";
import { db } from "../../../server/db";
import { projectStatus } from "../../../shared/schema";

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
    customerNumber: `CUST-${customerCounter}`,
    firstName: "Test",
    lastName: `Customer-${customerCounter}`,
    fullName: `Customer-${customerCounter}, Test`,
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
    name: `Projekt-${customerCounter}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT15 integration: project status lifecycle", () => {
  it("returns 422 when updating without version", async () => {
    const agent = await loginAdminAgent();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Neu", color: "#2563eb", description: null, sortOrder: 0 })
      .expect(201);

    await agent
      .put(`/api/project-status/${created.body.id}`)
      .send({ title: "Neu 2" })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("returns 409 VERSION_CONFLICT on stale update version", async () => {
    const agent = await loginAdminAgent();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "In Arbeit", color: "#0ea5e9", description: null, sortOrder: 1 })
      .expect(201);

    await agent
      .put(`/api/project-status/${created.body.id}`)
      .send({ title: "In Arbeit X", version: created.body.version + 3 })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("toggles active state successfully with version", async () => {
    const agent = await loginAdminAgent();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Geplant", color: "#84cc16", description: null, sortOrder: 2 })
      .expect(201);

    await agent
      .patch(`/api/project-status/${created.body.id}/active`)
      .send({ isActive: false, version: created.body.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.isActive).toBe(false);
      });
  });

  it("blocks delete when status is in use", async () => {
    const agent = await loginAdminAgent();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Montage", color: "#f59e0b", description: null, sortOrder: 3 })
      .expect(201);
    const project = await createProjectForTest();
    await projectStatusService.addProjectStatus(project.id, Number(created.body.id), 0, "ADMIN");

    await agent
      .delete(`/api/project-status/${created.body.id}`)
      .send({ version: created.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("blocks delete when status is default", async () => {
    const agent = await loginAdminAgent();
    const created = await agent
      .post("/api/project-status")
      .send({ title: "Default", color: "#8b5cf6", description: null, sortOrder: 4 })
      .expect(201);

    await db
      .update(projectStatus)
      .set({ isDefault: true })
      .where(eq(projectStatus.id, Number(created.body.id)));

    await agent
      .delete(`/api/project-status/${created.body.id}`)
      .send({ version: created.body.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });
});
