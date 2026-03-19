/**
 * Test Scope:
 *
 * Feature: FT03/FT24 - Wochenkalender Terminanhaenge
 * Use Case: UC Wochenkalender liefert pro Termin Terminanhang-Zaehler
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert appointmentAttachmentsCount fuer jeden Termin.
 * - Termine ohne Anhaenge liefern 0.
 * - Mehrere Termine mit unterschiedlicher Anhangsanzahl werden getrennt korrekt gezaehlt.
 *
 * Fehlerfaelle:
 * - Terminanhang-Zaehler fehlt im Kalenderpayload.
 * - Zaehler werden zwischen Terminen vermischt oder inkonsistent berechnet.
 *
 * Ziel:
 * End-to-end absichern, dass der Wochenkalender den Terminanhang-Zaehler korrekt aus der Aggregation erhaelt.
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

async function uploadAttachment(agent: SuperAgentTest, appointmentId: number, fileName: string) {
  await agent
    .post(`/api/appointments/${appointmentId}/attachments`)
    .attach("file", Buffer.from(`payload-${fileName}`), fileName)
    .expect(201);
}

describe("FT03/FT24 integration: calendar appointments attachment counts", () => {
  it("returns appointment attachment counts per appointment for zero and mixed scenarios", async () => {
    const admin = await loginAdminAgent();
    const graphA = await createProjectWithCustomer("A");
    const graphB = await createProjectWithCustomer("B");
    const graphC = await createProjectWithCustomer("C");

    const appointmentA = await createAppointment(graphA.project, "2098-08-10");
    const appointmentB = await createAppointment(graphB.project, "2098-08-11");
    const appointmentC = await createAppointment(graphC.project, "2098-08-12");

    expect(appointmentA?.id).toBeTruthy();
    expect(appointmentB?.id).toBeTruthy();
    expect(appointmentC?.id).toBeTruthy();

    await uploadAttachment(admin, Number(appointmentB?.id), "b-1.pdf");
    await uploadAttachment(admin, Number(appointmentC?.id), "c-1.pdf");
    await uploadAttachment(admin, Number(appointmentC?.id), "c-2.png");

    const response = await admin
      .get("/api/calendar/appointments?fromDate=2098-08-01&toDate=2098-08-31&detail=full")
      .expect(200);

    const items = response.body as Array<{
      id: number;
      appointmentAttachmentsCount: number;
    }>;

    const byId = new Map(items.map((item) => [item.id, item] as const));
    expect(byId.get(Number(appointmentA?.id))).toEqual(expect.objectContaining({ appointmentAttachmentsCount: 0 }));
    expect(byId.get(Number(appointmentB?.id))).toEqual(expect.objectContaining({ appointmentAttachmentsCount: 1 }));
    expect(byId.get(Number(appointmentC?.id))).toEqual(expect.objectContaining({ appointmentAttachmentsCount: 2 }));
  });
});
