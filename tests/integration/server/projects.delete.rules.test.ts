/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projekt loeschen
 *
 * Abgedeckte Regeln:
 * - Projekt-Loeschen ist nur ohne zugeordnete Termine erlaubt.
 * - Loeschen erfordert eine gueltige, aktuelle Version (optimistic locking).
 * - Nicht vorhandene Projekte liefern NOT_FOUND.
 *
 * Fehlerfaelle:
 * - Projekt mit mindestens einem Termin liefert BUSINESS_CONFLICT.
 * - Loeschen mit stale Version liefert VERSION_CONFLICT.
 * - Loeschen eines unbekannten Projekts liefert NOT_FOUND.
 *
 * Ziel:
 * End-to-end-Absicherung der FT02-Loeschregeln auf API-Ebene.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import { nextDeterministicToken, resetDeterministicTokens } from "../../helpers/deterministic";

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
  resetDeterministicTokens("projects-delete-rules");
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
  const token = nextDeterministicToken("projects-delete-rules");
  const customer = await customersService.createCustomer({
    customerNumber: `DEL-${token}`,
    firstName: "Test",
    lastName: `Customer-${token}`,
    fullName: `Customer-${token}, Test`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  return projectsService.createProject({
    name: `Delete-Projekt-${token}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT02 integration: project delete rules", () => {
  it("returns 204 when deleting project without appointments", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();

    await agent
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(204);
  });

  it("returns 409 BUSINESS_CONFLICT when project has at least one appointment", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();
    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-01-10",
      employeeIds: [],
    });

    await agent
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });
  });

  it("returns 409 VERSION_CONFLICT when deleting with stale version", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();

    await agent
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version + 1 })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("returns 404 NOT_FOUND for unknown project", async () => {
    const agent = await loginAdminAgent();

    await agent
      .delete("/api/projects/999999")
      .send({ version: 1 })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe("NOT_FOUND");
      });
  });
});
