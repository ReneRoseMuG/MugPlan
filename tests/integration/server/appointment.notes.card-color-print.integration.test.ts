/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Terminnotizen übernehmen cardColor aus Vorlagen und behalten den Druck-Default.
 * - Template-geerbte Kartenfarben bleiben beim Update serverseitig gesperrt.
 * - Freie Terminnotizen koennen cardColor und print selbst aendern.
 * - Normale Terminbearbeitungen lassen bestehende Terminnotizen unveraendert bestehen.
 * - Das Loeschen eines Termins raeumt dessen Terminnotiz-Bezuege auf.
 *
 * Fehlerfaelle:
 * - Vorlagenfarbe wird beim Terminnotiz-Create nicht vererbt.
 * - Update kann template-geerbte Kartenfarbe unzulaessig ueberschreiben.
 * - Ein Termin-Patch verliert Terminnotizen still als Nebeneffekt.
 * - Beim Terminloeschen bleiben Appointment-Notiz-Joins fuer den geloeschten Termin bestehen.
 *
 * Ziel:
 * Appointment-spezifische Integrationsabsicherung fuer Notizfelder, Sperrlogik und Lifecycle.
 */
import { and, eq } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import { appointmentNotes } from "../../../shared/schema";

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
  const bundle = await createAppointmentBundle();
  return bundle.appointmentId;
}

async function createAppointmentBundle() {
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
  return {
    appointmentId: Number(appointment.id),
    customerId: customer.id,
    projectId: project.id,
  };
}

describe("FT13 integration: appointment notes cardColor/print", () => {
  it("inherits template cardColor and keeps print default for appointment notes", async () => {
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
      expect(res.body.print).toBe(true);
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

  it("keeps appointment notes intact when the appointment itself is updated", async () => {
    const agent = await loginAdminAgent();
    const target = await createAppointmentBundle();
    const noise = await createAppointmentBundle();

    await agent.post(`/api/appointments/${noise.appointmentId}/notes`).send({
      title: "Nebennotiz",
      body: "<p>Noise</p>",
      cardColor: "#64748b",
      print: false,
    }).expect(201);

    const createdNote = await agent.post(`/api/appointments/${target.appointmentId}/notes`).send({
      title: "Zu erhaltene Terminnotiz",
      body: "<p>Bleibt bestehen</p>",
      cardColor: "#2563eb",
      print: true,
    }).expect(201);

    const appointmentDetail = await agent.get(`/api/appointments/${target.appointmentId}`).expect(200);

    await agent
      .patch(`/api/appointments/${target.appointmentId}`)
      .send({
        version: appointmentDetail.body.version,
        projectId: target.projectId,
        startDate: "2099-01-16",
        title: "Termin aktualisiert",
        employeeIds: [],
      })
      .expect(200);

    await agent.get(`/api/appointments/${target.appointmentId}/notes`).expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        id: createdNote.body.id,
        title: "Zu erhaltene Terminnotiz",
        body: "<p>Bleibt bestehen</p>",
        print: true,
      });
    });

    await agent.get(`/api/appointments/${noise.appointmentId}/notes`).expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ title: "Nebennotiz" });
    });
  });

  it("cleans up appointment note relations when deleting an appointment", async () => {
    const agent = await loginAdminAgent();
    const target = await createAppointmentBundle();
    const noise = await createAppointmentBundle();

    const targetNote = await agent.post(`/api/appointments/${target.appointmentId}/notes`).send({
      title: "Terminnotiz vor Delete",
      body: "<p>Wird ueber Join bereinigt</p>",
      cardColor: "#9333ea",
      print: false,
    }).expect(201);

    const noiseNote = await agent.post(`/api/appointments/${noise.appointmentId}/notes`).send({
      title: "Terminnotiz bleibt",
      body: "<p>Noise</p>",
      cardColor: "#0f766e",
      print: false,
    }).expect(201);

    const joinsBeforeDelete = await db
      .select()
      .from(appointmentNotes)
      .where(and(
        eq(appointmentNotes.appointmentId, target.appointmentId),
        eq(appointmentNotes.noteId, targetNote.body.id),
      ));
    expect(joinsBeforeDelete).toHaveLength(1);

    const detail = await agent.get(`/api/appointments/${target.appointmentId}`).expect(200);

    await agent
      .delete(`/api/appointments/${target.appointmentId}`)
      .send({ version: detail.body.version })
      .expect(204);

    await agent.get(`/api/appointments/${target.appointmentId}`).expect(404);
    await agent.get(`/api/appointments/${target.appointmentId}/notes`).expect(404);

    const joinsAfterDelete = await db
      .select()
      .from(appointmentNotes)
      .where(and(
        eq(appointmentNotes.appointmentId, target.appointmentId),
        eq(appointmentNotes.noteId, targetNote.body.id),
      ));
    expect(joinsAfterDelete).toHaveLength(0);

    const survivingNoiseJoin = await db
      .select()
      .from(appointmentNotes)
      .where(and(
        eq(appointmentNotes.appointmentId, noise.appointmentId),
        eq(appointmentNotes.noteId, noiseNote.body.id),
      ));
    expect(survivingNoiseJoin).toHaveLength(1);
  });
});
