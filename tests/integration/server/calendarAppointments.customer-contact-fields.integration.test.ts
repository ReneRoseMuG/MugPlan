/**
 * Test Scope:
 *
 * Feature: FT03 - Kalenderansichten / Wochenübersicht Kundendaten-Preview
 * Use Case: UC Kundenkontaktfelder im Kalender-API-Response
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert phone, email und company je Termin im customer-Objekt.
 * - Felder ohne Wert werden als null geliefert.
 * - Auch ?detail=full liefert die Felder korrekt (kein Verlust im full-Branch).
 *
 * Fehlerfälle:
 * - phone/email/company im Service-Mapping vergessen → Felder fehlen im Response.
 *
 * Ziel:
 * Sicherstellen, dass die Kontaktdaten des Kunden vollständig im Kalender-Response landen
 * und damit im Frontend-Preview angezeigt werden können.
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

async function createFixture(overrides: {
  phone?: string | null;
  email?: string | null;
  company?: string | null;
}) {
  const local = seq++;
  const customer = await customersService.createCustomer({
    customerNumber: `CAL-CONTACT-${Date.now()}-${local}`,
    firstName: "Test",
    lastName: `Kontakt-${local}`,
    fullName: `Kontakt-${local}, Test`,
    company: overrides.company ?? null,
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const project = await projectsService.createProject({
    name: `Projekt Kontakt ${local}`,
    customerId: customer.id,
    orderNumber: `ORD-CONTACT-${local}`,
    descriptionMd: null,
    version: 1,
  });

  const appointment = await appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-08-14",
    employeeIds: [],
  });

  return { customer, project, appointment };
}

describe("FT03 integration: calendar appointments liefern Kundenkontaktfelder", () => {
  it("liefert phone, email und company wenn am Kunden hinterlegt", async () => {
    const agent = await loginAdminAgent();
    const { appointment } = await createFixture({
      phone: "0175-1234567",
      email: "test@example.com",
      company: "Muster GmbH",
    });

    const response = await agent
      .get("/api/calendar/appointments?fromDate=2099-08-01&toDate=2099-08-31")
      .expect(200);

    type CustomerInResponse = {
      phone: string | null;
      email: string | null;
      company: string | null;
    };
    const item = (response.body as Array<{ id: number; customer: CustomerInResponse }>).find(
      (entry) => entry.id === appointment.id,
    );
    expect(item).toBeDefined();
    expect(item!.customer).toMatchObject({
      phone: "0175-1234567",
      email: "test@example.com",
      company: "Muster GmbH",
    });
  });

  it("liefert null für phone, email und company wenn nicht hinterlegt", async () => {
    const agent = await loginAdminAgent();
    const { appointment } = await createFixture({
      phone: null,
      email: null,
      company: null,
    });

    const response = await agent
      .get("/api/calendar/appointments?fromDate=2099-08-01&toDate=2099-08-31")
      .expect(200);

    type CustomerInResponse = {
      phone: string | null;
      email: string | null;
      company: string | null;
    };
    const item = (response.body as Array<{ id: number; customer: CustomerInResponse }>).find(
      (entry) => entry.id === appointment.id,
    );
    expect(item).toBeDefined();
    expect(item!.customer).toMatchObject({
      phone: null,
      email: null,
      company: null,
    });
  });

  it("liefert phone, email und company auch bei ?detail=full", async () => {
    const agent = await loginAdminAgent();
    const { appointment } = await createFixture({
      phone: "0171-9876543",
      email: "full@example.com",
      company: "Full GmbH",
    });

    const response = await agent
      .get("/api/calendar/appointments?fromDate=2099-08-01&toDate=2099-08-31&detail=full")
      .expect(200);

    type CustomerInResponse = {
      phone: string | null;
      email: string | null;
      company: string | null;
    };
    const item = (response.body as Array<{ id: number; customer: CustomerInResponse }>).find(
      (entry) => entry.id === appointment.id,
    );
    expect(item).toBeDefined();
    expect(item!.customer).toMatchObject({
      phone: "0171-9876543",
      email: "full@example.com",
      company: "Full GmbH",
    });
  });
});
