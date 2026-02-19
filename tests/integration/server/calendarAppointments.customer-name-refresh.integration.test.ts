/**
 * Test Scope:
 *
 * Feature: FT04/FT05+ - Kalendertermine und Kundenverwaltung
 * Use Case: UC Kundenname aendern und aktualisierte Projektion in Kalenderdaten erhalten
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert den aktuellen customer.fullName je Termin.
 * - Nach PATCH /api/customers/:id wird derselbe Termin mit aktualisiertem customer.fullName geliefert.
 * - Customer-Update erhoeht die Version plausibel (Optimistic-Locking-Vertrag).
 *
 * Fehlerfaelle:
 * - Stale Kundenname trotz erfolgreichem Kunden-Update.
 *
 * Ziel:
 * End-to-end absichern, dass Kalenderdaten den aktuellen Kundennamen nach Kundenbearbeitung enthalten.
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

async function createCustomerProjectAndAppointment() {
  const local = seq++;
  const customer = await customersService.createCustomer({
    customerNumber: `CAL-CUST-${Date.now()}-${local}`,
    firstName: "Alt",
    lastName: `Name-${local}`,
    fullName: `Name-${local}, Alt`,
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
    name: `Projekt ${local}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });

  const appointment = await appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-07-12",
    employeeIds: [],
  });

  return { customer, project, appointment };
}

describe("FT04/FT05+ integration: calendar appointments reflect updated customer names", () => {
  it("returns updated customer fullName for same appointment after customer patch", async () => {
    const agent = await loginAdminAgent();
    const { customer, project, appointment } = await createCustomerProjectAndAppointment();
    const updatedFirstName = "Neu";
    const updatedLastName = `Kunde-${customer.id}-Neu`;

    const initialResponse = await agent
      .get("/api/calendar/appointments?fromDate=2099-07-01&toDate=2099-07-31")
      .expect(200);

    const initialItem = (
      initialResponse.body as Array<{ id: number; projectId: number; customer: { fullName: string | null } }>
    ).find((entry) => entry.id === appointment.id);
    expect(initialItem).toBeDefined();
    if (!initialItem) {
      throw new Error("Expected appointment in initial calendar response");
    }
    expect(initialItem).toMatchObject({
      id: appointment.id,
      projectId: project.id,
      customer: {
        fullName: customer.fullName,
      },
    });

    const patchResponse = await agent
      .patch(`/api/customers/${customer.id}`)
      .send({
        version: customer.version,
        firstName: updatedFirstName,
        lastName: updatedLastName,
      })
      .expect(200);

    expect(Number.isInteger(patchResponse.body.version)).toBe(true);
    expect(patchResponse.body.version).toBeGreaterThan(customer.version);

    const refreshedResponse = await agent
      .get("/api/calendar/appointments?fromDate=2099-07-01&toDate=2099-07-31")
      .expect(200);

    const refreshedItem = (
      refreshedResponse.body as Array<{ id: number; projectId: number; customer: { fullName: string | null } }>
    ).find((entry) => entry.id === appointment.id);
    expect(refreshedItem).toBeDefined();
    if (!refreshedItem) {
      throw new Error("Expected appointment in refreshed calendar response");
    }
    expect(refreshedItem).toMatchObject({
      id: appointment.id,
      projectId: project.id,
      customer: {
        fullName: `${updatedLastName}, ${updatedFirstName}`,
      },
    });
  });
});
