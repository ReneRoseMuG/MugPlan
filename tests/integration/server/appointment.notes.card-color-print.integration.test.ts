/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Terminnotizen uebernehmen cardColor und print aus Vorlagen.
 * - Template-geerbte Kartenfarben bleiben beim Update serverseitig gesperrt.
 * - Freie Terminnotizen koennen cardColor und print selbst aendern.
 *
 * Fehlerfaelle:
 * - Vorlagenwerte werden beim Terminnotiz-Create nicht vererbt.
 * - Update kann template-geerbte Kartenfarbe unzulaessig ueberschreiben.
 *
 * Ziel:
 * Appointment-spezifische Integrationsabsicherung fuer die neuen Notizfelder und deren Sperrlogik.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";

let app: express.Express;
let sequence = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextToken(prefix: string) {
  const token = `${prefix}-${Date.now()}-${sequence}`;
  sequence += 1;
  return token;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createAppointmentFixture() {
  const customer = await customersService.createCustomer({
    customerNumber: nextToken("APPT-NOTE-CUST"),
    firstName: "Appt",
    lastName: "Note",
    fullName: "Appt Note",
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
    name: nextToken("APPT-NOTE-PROJ"),
    orderNumber: nextToken("APPT-NOTE-ORD"),
    descriptionMd: null,
    version: 1,
  });
  const appointment = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: customer.id,
      tourId: null,
      title: nextToken("APPT-NOTE"),
      description: null,
      startDate: new Date("2099-01-15T00:00:00"),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );
  return Number(appointment.id);
}

describe("FT13 integration: appointment notes cardColor/print", () => {
  it("inherits template cardColor and print for appointment notes", async () => {
    const agent = await loginAdminAgent();
    const appointmentId = await createAppointmentFixture();

    const template = await agent.post("/api/note-templates").send({
      title: nextToken("TPL-APPT"),
      body: "<p>Template body</p>",
      cardColor: "#14b8a6",
      print: false,
      sortOrder: 0,
      isActive: true,
    }).expect(201);

    await agent.post(`/api/appointments/${appointmentId}/notes`).send({
      title: "Terminnotiz",
      body: "<p>Body</p>",
      templateId: template.body.id,
    }).expect(201).expect((res) => {
      expect(res.body.cardColor).toBe("#14b8a6");
      expect(res.body.print).toBe(false);
      expect(res.body.cardColorLocked).toBe(true);
    });
  });

  it("keeps locked appointment note color immutable while allowing print change", async () => {
    const agent = await loginAdminAgent();
    const appointmentId = await createAppointmentFixture();

    const template = await agent.post("/api/note-templates").send({
      title: nextToken("TPL-LOCK"),
      body: "<p>Template body</p>",
      cardColor: "#f97316",
      print: true,
      sortOrder: 0,
      isActive: true,
    }).expect(201);

    const note = await agent.post(`/api/appointments/${appointmentId}/notes`).send({
      title: "Locked note",
      body: "<p>Body</p>",
      templateId: template.body.id,
    }).expect(201);

    await agent.put(`/api/notes/${note.body.id}`).send({
      cardColor: "#ef4444",
      print: false,
      version: note.body.version,
    }).expect(200).expect((res) => {
      expect(res.body.cardColor).toBe("#f97316");
      expect(res.body.print).toBe(false);
      expect(res.body.cardColorLocked).toBe(true);
    });
  });

  it("updates free appointment note cardColor and print", async () => {
    const agent = await loginAdminAgent();
    const appointmentId = await createAppointmentFixture();

    const note = await agent.post(`/api/appointments/${appointmentId}/notes`).send({
      title: "Free note",
      body: "<p>Body</p>",
      cardColor: "#c084fc",
      print: true,
    }).expect(201);

    await agent.put(`/api/notes/${note.body.id}`).send({
      cardColor: "#22c55e",
      print: false,
      version: note.body.version,
    }).expect(200).expect((res) => {
      expect(res.body.cardColor).toBe("#22c55e");
      expect(res.body.print).toBe(false);
      expect(res.body.cardColorLocked).toBe(false);
    });
  });
});
