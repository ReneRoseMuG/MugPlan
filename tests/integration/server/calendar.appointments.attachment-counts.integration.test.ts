/**
 * Test Scope:
 *
 * Feature: FT03/FT24 - Wochenkalender Terminanhaenge
 * Use Case: UC Wochenkalender liefert akkumulierte Dokument-Zaehler fuer Kunde, Projekt und Termin
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert customerAttachmentsCount, projectAttachmentsCount, appointmentAttachmentsCount und totalAttachmentsCount.
 * - Termine ohne Projekt liefern projectAttachmentsCount sauber als 0.
 * - Kunden-, Projekt- und Terminanhaenge werden getrennt und summiert korrekt gezaehlt.
 *
 * Fehlerfaelle:
 * - Dokument-Zaehler fehlen im Kalenderpayload oder summieren falsch.
 * - Kunden-, Projekt- und Terminzaehler werden zwischen Terminen vermischt.
 *
 * Ziel:
 * End-to-end absichern, dass der Wochenkalender die akkumulierten Dokument-Zaehler korrekt aus der Aggregation erhaelt.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";

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

async function createProjectWithCustomer(label: string) {
  const token = `FT24-CAL-ATT-${label}-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Kalender",
    lastName: token,
    fullName: `${token}, Kalender`,
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
    customerId: customer.id,
    name: `Kalender Attachment Projekt ${label}`,
    orderNumber: `ORD-${token}`,
    descriptionMd: null,
    version: 1,
  });

  return { customer, project };
}

async function createAppointment(project: { id: number }, startDate: string) {
  return appointmentsService.createAppointment({
    projectId: project.id,
    startDate,
    endDate: null,
    startTime: null,
    employeeIds: [],
  });
}

async function createCustomerOnlyAppointment(label: string, startDate: string) {
  const token = `FT24-CAL-ATT-CUSTOMER-ONLY-${label}-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Kalender",
    lastName: token,
    fullName: `${token}, Kalender`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const appointment = await appointmentsService.createAppointment({
    customerId: customer.id,
    startDate,
    endDate: null,
    startTime: null,
    employeeIds: [],
  });

  return { customer, appointment };
}

async function uploadAppointmentAttachment(agent: SuperAgentTest, appointmentId: number, fileName: string) {
  await agent
    .post(`/api/appointments/${appointmentId}/attachments`)
    .attach("file", Buffer.from(`payload-${fileName}`), fileName)
    .expect(201);
}

async function uploadProjectAttachment(agent: SuperAgentTest, projectId: number, fileName: string) {
  await agent
    .post(`/api/projects/${projectId}/attachments`)
    .attach("file", Buffer.from(`payload-${fileName}`), fileName)
    .expect(201);
}

async function uploadCustomerAttachment(agent: SuperAgentTest, customerId: number, fileName: string) {
  await agent
    .post(`/api/customers/${customerId}/attachments`)
    .attach("file", Buffer.from(`payload-${fileName}`), fileName)
    .expect(201);
}

describe("FT03/FT24 integration: calendar appointments attachment counts", () => {
  it("returns customer, project, appointment and total attachment counts per appointment", async () => {
    const admin = await loginAdminAgent();
    const appointmentOnlyGraph = await createProjectWithCustomer("APPOINTMENT");
    const projectOnlyGraph = await createProjectWithCustomer("PROJECT");
    const customerOnlyGraph = await createProjectWithCustomer("CUSTOMER");
    const mixedGraph = await createProjectWithCustomer("MIXED");
    const noProjectGraph = await createCustomerOnlyAppointment("NO-PROJECT", "2098-08-14");

    const appointmentOnly = await createAppointment(appointmentOnlyGraph.project, "2098-08-10");
    const projectOnly = await createAppointment(projectOnlyGraph.project, "2098-08-11");
    const customerOnly = await createAppointment(customerOnlyGraph.project, "2098-08-12");
    const mixed = await createAppointment(mixedGraph.project, "2098-08-13");

    expect(appointmentOnly?.id).toBeTruthy();
    expect(projectOnly?.id).toBeTruthy();
    expect(customerOnly?.id).toBeTruthy();
    expect(mixed?.id).toBeTruthy();
    expect(noProjectGraph.appointment?.id).toBeTruthy();

    await uploadAppointmentAttachment(admin, Number(appointmentOnly?.id), "appointment-only.pdf");
    await uploadProjectAttachment(admin, projectOnlyGraph.project.id, "project-only.pdf");
    await uploadCustomerAttachment(admin, customerOnlyGraph.customer.id, "customer-only.pdf");
    await uploadCustomerAttachment(admin, mixedGraph.customer.id, "mixed-customer.pdf");
    await uploadProjectAttachment(admin, mixedGraph.project.id, "mixed-project.pdf");
    await uploadAppointmentAttachment(admin, Number(mixed?.id), "mixed-appointment.pdf");

    const response = await admin
      .get("/api/calendar/appointments?fromDate=2098-08-01&toDate=2098-08-31&detail=full")
      .expect(200);

    const items = response.body as Array<{
      id: number;
      customerAttachmentsCount: number;
      projectAttachmentsCount: number;
      appointmentAttachmentsCount: number;
      totalAttachmentsCount: number;
    }>;

    const byId = new Map(items.map((item) => [item.id, item] as const));
    expect(byId.get(Number(appointmentOnly?.id))).toEqual(expect.objectContaining({
      customerAttachmentsCount: 0,
      projectAttachmentsCount: 0,
      appointmentAttachmentsCount: 1,
      totalAttachmentsCount: 1,
    }));
    expect(byId.get(Number(projectOnly?.id))).toEqual(expect.objectContaining({
      customerAttachmentsCount: 0,
      projectAttachmentsCount: 1,
      appointmentAttachmentsCount: 0,
      totalAttachmentsCount: 1,
    }));
    expect(byId.get(Number(customerOnly?.id))).toEqual(expect.objectContaining({
      customerAttachmentsCount: 1,
      projectAttachmentsCount: 0,
      appointmentAttachmentsCount: 0,
      totalAttachmentsCount: 1,
    }));
    expect(byId.get(Number(mixed?.id))).toEqual(expect.objectContaining({
      customerAttachmentsCount: 1,
      projectAttachmentsCount: 1,
      appointmentAttachmentsCount: 1,
      totalAttachmentsCount: 3,
    }));
    expect(byId.get(Number(noProjectGraph.appointment?.id))).toEqual(expect.objectContaining({
      customerAttachmentsCount: 0,
      projectAttachmentsCount: 0,
      appointmentAttachmentsCount: 0,
      totalAttachmentsCount: 0,
    }));
  });
});
