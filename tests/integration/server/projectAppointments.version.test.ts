/**
 * Test Scope:
 *
 * Feature: FT04 - Terminverwaltung
 * Use Case: UC Projekttermine im Seitenpanel laden
 *
 * Abgedeckte Regeln:
 * - Projekttermine liefern pro Termin die aktuelle Version fuer Optimistic Locking.
 * - Die Rueckgabe bleibt fuer gueltige Datumsfilter abrufbar.
 *
 * Fehlerfaelle:
 * - Fehlendes Versionsfeld im Response bricht den Loesch-Contract im Client.
 *
 * Ziel:
 * End-to-end absichern, dass /api/projects/:projectId/appointments die Version im Item enthaelt.
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
import * as appointmentsService from "../../../server/services/appointmentsService";

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
    customerNumber: `PAV-${customerCounter}`,
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
    name: `Project-Appointments-${customerCounter}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT04 integration: project appointments version contract", () => {
  it("returns version on project appointment list items", async () => {
    const agent = await loginAdminAgent();
    const project = await createProjectForTest();

    const created = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-03-05",
      employeeIds: [],
    });

    await agent
      .get(`/api/projects/${project.id}/appointments?fromDate=2000-01-01`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        const item = res.body.find((entry: { id: number }) => entry.id === created.id);
        expect(item).toBeDefined();
        if (!item) {
          throw new Error("Expected appointment item in project appointments response");
        }
        expect(item).toMatchObject({
          id: created.id,
          projectId: project.id,
        });
        expect(Number.isInteger(item.version)).toBe(true);
        expect(item.version).toBeGreaterThanOrEqual(1);
      });
  });
});
