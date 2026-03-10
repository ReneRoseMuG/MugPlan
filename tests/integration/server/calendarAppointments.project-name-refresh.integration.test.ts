/**
 * Test Scope:
 *
 * Feature: FT04/FT02 - Kalendertermine und Projektverwaltung
 * Use Case: UC Projektname aendern und aktualisierte Projektion in Kalenderdaten erhalten
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert den aktuellen projectName je Termin.
 * - Nach PATCH /api/projects/:id wird derselbe Termin mit aktualisiertem projectName geliefert.
 * - Projekt-Update erhoeht die Version plausibel (Optimistic-Locking-Vertrag).
 *
 * Fehlerfaelle:
 * - Stale Projektname trotz erfolgreichem Projekt-Update.
 *
 * Ziel:
 * End-to-end absichern, dass Kalenderdaten den aktuellen Projektnamen nach Projektbearbeitung enthalten.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";

let app: express.Express;
let seq = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createCustomerAndProject() {
  const local = seq++;
  const customerNumber = `CAL-REFRESH-${Date.now()}-${local}`;
  const customer = await customersService.createCustomer({
    customerNumber,
    firstName: "Calendar",
    lastName: `Refresh-${local}`,
    fullName: `Refresh-${local}, Calendar`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const project = await projectsService.createProject({
    name: "Sauna Alt",
    customerId: customer.id,
    orderNumber: `ORD-CAL-PROJ-${local}`,
    descriptionMd: null,
    version: 1,
  });

  return { customer, project };
}

describe("FT04/FT02 integration: calendar appointments reflect updated project names", () => {
  it("returns updated projectName for the same appointment after project patch", async () => {
    const agent = await loginAdminAgent();
    const { project } = await createCustomerAndProject();

    const createdAppointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-06-10",
      employeeIds: [],
    });

    const initialResponse = await agent
      .get("/api/calendar/appointments?fromDate=2099-06-01&toDate=2099-06-30")
      .expect(200);

    const initialItem = (initialResponse.body as Array<{ id: number; projectId: number; projectName: string }>).find(
      (item) => item.id === createdAppointment.id,
    );
    expect(initialItem).toBeDefined();
    if (!initialItem) {
      throw new Error("Expected appointment in initial calendar response");
    }
    expect(initialItem).toMatchObject({
      id: createdAppointment.id,
      projectId: project.id,
      projectName: "Sauna Alt",
    });

    const updatedIsolatedName = "Sauna Neu";
    const patchResponse = await agent
      .patch(`/api/projects/${project.id}`)
      .send({
        version: project.version,
        name: updatedIsolatedName,
      })
      .expect(200);

    expect(Number.isInteger(patchResponse.body.version)).toBe(true);
    expect(patchResponse.body.version).toBeGreaterThan(project.version);

    const refreshedResponse = await agent
      .get("/api/calendar/appointments?fromDate=2099-06-01&toDate=2099-06-30")
      .expect(200);

    const refreshedItem = (refreshedResponse.body as Array<{ id: number; projectId: number; projectName: string }>).find(
      (item) => item.id === createdAppointment.id,
    );
    expect(refreshedItem).toBeDefined();
    if (!refreshedItem) {
      throw new Error("Expected appointment in refreshed calendar response");
    }
    expect(refreshedItem).toMatchObject({
      id: createdAppointment.id,
      projectId: project.id,
      projectName: updatedIsolatedName,
    });
  });
});
