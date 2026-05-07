/**
 * Test Scope:
 *
 * Feature: FT01/FT03/FT09/FT13 - Wochenkalender Termin-Karten mit Notiz-Footer
 * Use Case: UC Wochenkalender zeigt pro Termin Kunden-/Projekt-/Terminnotiz-Zaehler
 *
 * Abgedeckte Regeln:
 * - /api/calendar/appointments liefert customerNotesCount, projectNotesCount und appointmentNotesCount fuer jeden Termin.
 * - Termine ohne Notizen liefern 0/0/0.
 * - Nur Kunden- oder nur Projektnotizen werden getrennt korrekt gezaehlt.
 * - Termin-Notizen werden appointment-spezifisch separat gezaehlt.
 * - Mehrere Termine mit gleichem Kunde/Projekt teilen sich konsistente Zaehler.
 *
 * Fehlerfaelle:
 * - Notizzaehler fehlen im Kalenderpayload.
 * - Zaehler werden pro Termin inkonsistent berechnet.
 *
 * Ziel:
 * End-to-end absichern, dass der Wochenkalender fuer den Notiz-Footer die korrekten Zaehlerwerte erhaelt.
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
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let seq = 0;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextSeq() {
  seq += 1;
  return seq;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createCustomer(label: string) {
  const unique = `${nextDeterministicToken("calendar-notes-customer")}-${nextSeq()}`;
  return customersService.createCustomer({
    customerNumber: `CAL-NOTE-${label}-${unique}`,
    firstName: "Kalender",
    lastName: `Notiz-${label}`,
    fullName: `Notiz-${label}, Kalender`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
}

async function createProject(customerId: number, label: string) {
  return projectsService.createProject({
    name: `Kalender Notiz Projekt ${label} ${nextDeterministicToken("calendar-notes-project")}-${nextSeq()}`,
    customerId,
    descriptionMd: null,
    orderNumber: `ORD-CAL-NOTE-${label}-${nextDeterministicToken("calendar-notes-order")}-${nextSeq()}`,
    version: 1,
  });
}

async function createAppointment(project: { id: number; customerId: number }, startDate: string, title: string): Promise<number> {
  const created = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: project.customerId,
      tourId: null,
      title,
      description: null,
      startDate: new Date(`${startDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );
  return created.id as number;
}

async function createCustomerNote(agent: SuperAgentTest, customerId: number, title: string) {
  await agent
    .post(`/api/customers/${customerId}/notes`)
    .send({
      title,
      body: `<p>${title}</p>`,
    })
    .expect(201);
}

async function createProjectNote(agent: SuperAgentTest, projectId: number, title: string) {
  const response = await agent
    .post(`/api/projects/${projectId}/notes`)
    .send({
      title,
      body: `<p>${title}</p>`,
    })
    .expect(201);
  return response.body as { id: number; version: number };
}

async function createAppointmentNote(agent: SuperAgentTest, appointmentId: number, title: string) {
  const response = await agent
    .post(`/api/appointments/${appointmentId}/notes`)
    .send({
      title,
      body: `<p>${title}</p>`,
    })
    .expect(201);
  return response.body as { id: number; version: number };
}

describe("FT03 integration: calendar appointments note counts", () => {
  it("returns customer/project/appointment note counts per appointment with zero and mixed scenarios", async () => {
    const admin = await loginAdminAgent();
    const customerA = await createCustomer("A");
    const customerB = await createCustomer("B");
    const customerC = await createCustomer("C");

    const projectA1 = await createProject(customerA.id, "A1");
    const projectA2 = await createProject(customerA.id, "A2");
    const projectB1 = await createProject(customerB.id, "B1");
    const projectC1 = await createProject(customerC.id, "C1");

    const appointmentA1 = await createAppointment(projectA1, "2098-07-10", "A1-1");
    const appointmentA2 = await createAppointment(projectA1, "2098-07-11", "A1-2");
    const appointmentA3 = await createAppointment(projectA2, "2098-07-12", "A2-1");
    const appointmentB1 = await createAppointment(projectB1, "2098-07-13", "B1-1");
    const appointmentC1 = await createAppointment(projectC1, "2098-07-14", "C1-1");

    await createCustomerNote(admin, customerA.id, "Kunde A 1");
    await createCustomerNote(admin, customerA.id, "Kunde A 2");
    await createProjectNote(admin, projectA1.id, "Projekt A1 1");
    await createProjectNote(admin, projectA1.id, "Projekt A1 2");
    await createProjectNote(admin, projectA1.id, "Projekt A1 3");
    await createProjectNote(admin, projectB1.id, "Projekt B1 1");
    await createAppointmentNote(admin, appointmentA1, "Termin A1 1");
    await createAppointmentNote(admin, appointmentA1, "Termin A1 2");
    await createAppointmentNote(admin, appointmentB1, "Termin B1 1");

    const response = await admin
      .get("/api/calendar/appointments?fromDate=2098-07-01&toDate=2098-07-31&detail=full")
      .expect(200);

    const items = response.body as Array<{
      id: number;
      customerNotesCount: number;
      projectNotesCount: number;
      appointmentNotesCount: number;
    }>;

    const byId = new Map(items.map((item) => [item.id, item] as const));
    expect(byId.get(appointmentA1)).toEqual(expect.objectContaining({ customerNotesCount: 2, projectNotesCount: 3, appointmentNotesCount: 2 }));
    expect(byId.get(appointmentA2)).toEqual(expect.objectContaining({ customerNotesCount: 2, projectNotesCount: 3, appointmentNotesCount: 0 }));
    expect(byId.get(appointmentA3)).toEqual(expect.objectContaining({ customerNotesCount: 2, projectNotesCount: 0, appointmentNotesCount: 0 }));
    expect(byId.get(appointmentB1)).toEqual(expect.objectContaining({ customerNotesCount: 0, projectNotesCount: 1, appointmentNotesCount: 1 }));
    expect(byId.get(appointmentC1)).toEqual(expect.objectContaining({ customerNotesCount: 0, projectNotesCount: 0, appointmentNotesCount: 0 }));
  });

  it("returns appointment and project note previews for inline week calendar cards when explicitly requested", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("PREVIEW");
    const project = await createProject(customer.id, "PREVIEW");
    const appointmentId = await createAppointment(project, "2098-08-10", "Preview-1");

    await createCustomerNote(admin, customer.id, "Kunde Preview nur Zähler");
    const projectNote = await createProjectNote(admin, project.id, "Projekt Preview Inline");
    const appointmentNote = await createAppointmentNote(admin, appointmentId, "Termin Preview Inline");

    const response = await admin
      .get(
        "/api/calendar/appointments?fromDate=2098-08-01&toDate=2098-08-31&detail=full&includeAppointmentNotes=true&includeProjectNotes=true",
      )
      .expect(200);

    const appointment = response.body.find((item: { id: number }) => item.id === appointmentId);

    expect(appointment).toEqual(expect.objectContaining({
      customerNotesCount: 1,
      projectNotesCount: 1,
      appointmentNotesCount: 1,
      appointmentNotesPreview: [
        expect.objectContaining({
          version: appointmentNote.version,
          cardColorLocked: false,
          title: "Termin Preview Inline",
          body: "<p>Termin Preview Inline</p>",
        }),
      ],
      projectNotesPreview: [
        expect.objectContaining({
          version: projectNote.version,
          cardColorLocked: false,
          title: "Projekt Preview Inline",
          body: "<p>Projekt Preview Inline</p>",
        }),
      ],
    }));
    expect(appointment.customerNotesPreview).toBeUndefined();
  });
});
