/**
 * Test Scope:
 *
 * Feature: FT19 – Attachment Lösch-Workflow
 * Use Case: Soft-Delete (Entkopplung) und Hard-Delete (physische Löschung) für alle vier Domänen
 *
 * Abgedeckte Regeln:
 * - Soft-Delete entfernt den DB-Datensatz; die physische Datei bleibt im Upload-Verzeichnis.
 * - Hard-Delete entfernt Datensatz und physische Datei vollständig.
 * - Unauthentifizierter Zugriff → 401.
 * - Leser-Rolle ohne Änderungsrecht → 403.
 * - Unbekanntes Attachment → 404.
 * - Historischer Termin (startDate in der Vergangenheit) → 403 für Soft- und Hard-Delete,
 *   Anzeige (GET) weiterhin erlaubt.
 *
 * API-Design-Annahme:
 * - Soft-Delete: DELETE /api/{domain}-attachments/:id
 * - Hard-Delete: DELETE /api/{domain}-attachments/:id?mode=hard
 *
 * Parametrisierung:
 * Alle Domänen (Projekt, Kunde, Mitarbeiter, Termin) durchlaufen dieselben Testfälle.
 *
 * Ziel:
 * Vollständige server-seitige Absicherung des Lösch-Workflows für alle vier Domänen.
 */
import fs from "fs";
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as projectAttachmentsService from "../../../server/services/projectAttachmentsService";
import * as customerAttachmentsService from "../../../server/services/customerAttachmentsService";
import * as employeeAttachmentsService from "../../../server/services/employeeAttachmentsService";
import * as appointmentAttachmentsService from "../../../server/services/appointmentAttachmentsService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

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

async function loginReaderAgent(): Promise<SuperAgentTest> {
  const suffix = `ft19-del-reader-${Date.now()}-${seq++}`;
  const username = `test-${suffix}`;
  const password = `pw-${suffix}`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${suffix}@local.test`,
    firstName: "Reader",
    lastName: suffix,
    passwordHash,
    roleCode: "READER",
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createProjectParent(): Promise<{ id: number }> {
  const token = `FT19-DEL-PROJ-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Del",
    lastName: token,
    fullName: `${token}, Del`,
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
    name: `Del Projekt ${token}`,
    orderNumber: `ORD-DEL-${token}`,
    descriptionMd: null,
    version: 1,
  });
  return { id: project.id };
}

async function createCustomerParent(): Promise<{ id: number }> {
  const token = `FT19-DEL-CUST-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Del",
    lastName: token,
    fullName: `${token}, Del`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  return { id: customer.id };
}

async function createEmployeeParent(admin: SuperAgentTest): Promise<{ id: number }> {
  const res = await admin
    .post("/api/employees")
    .send({
      firstName: `DelMitarbeiter-${seq++}`,
      lastName: "FT19Delete",
      phone: null,
      email: null,
    })
    .expect(201);
  return { id: res.body.id as number };
}

async function createAppointmentParent(): Promise<{ id: number }> {
  const token = `FT19-DEL-APPT-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Del",
    lastName: token,
    fullName: `${token}, Del`,
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
    name: `Del Termin Projekt ${token}`,
    orderNumber: `ORD-DEL-APPT-${token}`,
    descriptionMd: null,
    version: 1,
  });
  const appointment = await appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-06-15",
    endDate: null,
    startTime: null,
    employeeIds: [],
  });
  return { id: Number(appointment?.id) };
}

async function createHistoricalAppointmentParent(): Promise<{ id: number }> {
  const token = `FT19-DEL-HIST-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Hist",
    lastName: token,
    fullName: `${token}, Hist`,
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
    name: `Hist Termin Projekt ${token}`,
    orderNumber: `ORD-HIST-${token}`,
    descriptionMd: null,
    version: 1,
  });
  // Repository direkt verwenden, um Service-Validierung (PAST_APPOINTMENT_READONLY) zu umgehen
  const appointment = await appointmentsRepository.createAppointment(
    { projectId: project.id, startDate: "2020-01-10", endDate: null, startTime: null },
    [],
  );
  return { id: Number(appointment?.id) };
}

type AttachmentRecord = {
  id: number;
  storagePath: string;
};

type DomainConfig = {
  name: string;
  uploadUrl: (parentId: number) => string;
  listUrl: (parentId: number) => string;
  softDeleteUrl: (attachmentId: number) => string;
  hardDeleteUrl: (attachmentId: number) => string;
  downloadUrl: (attachmentId: number) => string;
  createParent: (admin: SuperAgentTest) => Promise<{ id: number }>;
  getAttachmentById: (id: number) => Promise<AttachmentRecord | null>;
};

function buildDomainConfigs(): DomainConfig[] {
  return [
    {
      name: "Projekt",
      uploadUrl: (pid) => `/api/projects/${pid}/attachments`,
      listUrl: (pid) => `/api/projects/${pid}/attachments`,
      softDeleteUrl: (id) => `/api/project-attachments/${id}`,
      hardDeleteUrl: (id) => `/api/project-attachments/${id}?mode=hard`,
      downloadUrl: (id) => `/api/project-attachments/${id}/download`,
      createParent: () => createProjectParent(),
      getAttachmentById: (id) => projectAttachmentsService.getProjectAttachmentById(id),
    },
    {
      name: "Kunde",
      uploadUrl: (cid) => `/api/customers/${cid}/attachments`,
      listUrl: (cid) => `/api/customers/${cid}/attachments`,
      softDeleteUrl: (id) => `/api/customer-attachments/${id}`,
      hardDeleteUrl: (id) => `/api/customer-attachments/${id}?mode=hard`,
      downloadUrl: (id) => `/api/customer-attachments/${id}/download`,
      createParent: () => createCustomerParent(),
      getAttachmentById: (id) => customerAttachmentsService.getCustomerAttachmentById(id),
    },
    {
      name: "Mitarbeiter",
      uploadUrl: (eid) => `/api/employees/${eid}/attachments`,
      listUrl: (eid) => `/api/employees/${eid}/attachments`,
      softDeleteUrl: (id) => `/api/employee-attachments/${id}`,
      hardDeleteUrl: (id) => `/api/employee-attachments/${id}?mode=hard`,
      downloadUrl: (id) => `/api/employee-attachments/${id}/download`,
      createParent: (admin) => createEmployeeParent(admin),
      getAttachmentById: (id) => employeeAttachmentsService.getEmployeeAttachmentById(id),
    },
    {
      name: "Termin",
      uploadUrl: (aid) => `/api/appointments/${aid}/attachments`,
      listUrl: (aid) => `/api/appointments/${aid}/attachments`,
      softDeleteUrl: (id) => `/api/appointment-attachments/${id}`,
      hardDeleteUrl: (id) => `/api/appointment-attachments/${id}?mode=hard`,
      downloadUrl: (id) => `/api/appointment-attachments/${id}/download`,
      createParent: () => createAppointmentParent(),
      getAttachmentById: (id) => appointmentAttachmentsService.getAppointmentAttachmentById(id),
    },
  ];
}

const domains = buildDomainConfigs();

describe.each(domains)("FT19 Lösch-Workflow: $name", (domain) => {
  describe("Soft-Delete (Entkopplung)", () => {
    it("entfernt Datensatz aus der Liste, HTTP 200", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("soft-delete-test"), "soft.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      expect(Number.isInteger(attachmentId)).toBe(true);

      await admin.delete(domain.softDeleteUrl(attachmentId)).expect(200);

      const list = await admin.get(domain.listUrl(parent.id)).expect(200);
      const ids = (list.body as Array<{ id: number }>).map((a) => a.id);
      expect(ids).not.toContain(attachmentId);
    });

    it("lässt die physische Datei nach Soft-Delete im Upload-Verzeichnis", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("soft-file-check"), "soft-file.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      const record = await domain.getAttachmentById(attachmentId);
      expect(record).not.toBeNull();
      const storagePath = record!.storagePath;

      await admin.delete(domain.softDeleteUrl(attachmentId)).expect(200);

      expect(fs.existsSync(storagePath)).toBe(true);
    });

    it("liefert 404 bei unbekannter Attachment-ID", async () => {
      const admin = await loginAdminAgent();
      await admin.delete(domain.softDeleteUrl(999999999)).expect(404);
    });

    it("liefert 403 für Leser-Rolle", async () => {
      const admin = await loginAdminAgent();
      const reader = await loginReaderAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("reader-block"), "reader.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      await reader.delete(domain.softDeleteUrl(attachmentId)).expect(403);
    });

    it("liefert 401 für unauthentifizierten Zugriff", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("anon-block"), "anon.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      await request(app).delete(domain.softDeleteUrl(attachmentId)).expect(401);
    });
  });

  describe("Hard-Delete (physische Löschung)", () => {
    it("entfernt Datensatz aus der Liste, HTTP 200", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("hard-delete-test"), "hard.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);

      await admin.delete(domain.hardDeleteUrl(attachmentId)).expect(200);

      const list = await admin.get(domain.listUrl(parent.id)).expect(200);
      const ids = (list.body as Array<{ id: number }>).map((a) => a.id);
      expect(ids).not.toContain(attachmentId);
    });

    it("löscht die physische Datei beim Hard-Delete", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("hard-file-check"), "hard-file.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      const record = await domain.getAttachmentById(attachmentId);
      expect(record).not.toBeNull();
      const storagePath = record!.storagePath;

      await admin.delete(domain.hardDeleteUrl(attachmentId)).expect(200);

      expect(fs.existsSync(storagePath)).toBe(false);
    });

    it("liefert 404 bei unbekannter Attachment-ID", async () => {
      const admin = await loginAdminAgent();
      await admin.delete(domain.hardDeleteUrl(999999999)).expect(404);
    });

    it("liefert 403 für Leser-Rolle", async () => {
      const admin = await loginAdminAgent();
      const reader = await loginReaderAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("hard-reader-block"), "hard-reader.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      await reader.delete(domain.hardDeleteUrl(attachmentId)).expect(403);
    });

    it("liefert 401 für unauthentifizierten Zugriff", async () => {
      const admin = await loginAdminAgent();
      const parent = await domain.createParent(admin);

      const upload = await admin
        .post(domain.uploadUrl(parent.id))
        .attach("file", Buffer.from("hard-anon-block"), "hard-anon.pdf")
        .expect(201);

      const attachmentId = Number(upload.body.id);
      await request(app).delete(domain.hardDeleteUrl(attachmentId)).expect(401);
    });
  });
});

describe("FT19 Termin-Sonderregel: historischer Termin", () => {
  it("Soft-Delete auf Attachment eines historischen Termins → 403", async () => {
    const admin = await loginAdminAgent();
    const parent = await createHistoricalAppointmentParent();

    const upload = await admin
      .post(`/api/appointments/${parent.id}/attachments`)
      .attach("file", Buffer.from("hist-soft"), "hist-soft.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    await admin.delete(`/api/appointment-attachments/${attachmentId}`).expect(403);
  });

  it("Hard-Delete auf Attachment eines historischen Termins → 403", async () => {
    const admin = await loginAdminAgent();
    const parent = await createHistoricalAppointmentParent();

    const upload = await admin
      .post(`/api/appointments/${parent.id}/attachments`)
      .attach("file", Buffer.from("hist-hard"), "hist-hard.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    await admin.delete(`/api/appointment-attachments/${attachmentId}?mode=hard`).expect(403);
  });

  it("GET (Anzeige) eines Attachments eines historischen Termins → weiterhin erlaubt", async () => {
    const admin = await loginAdminAgent();
    const parent = await createHistoricalAppointmentParent();

    const upload = await admin
      .post(`/api/appointments/${parent.id}/attachments`)
      .attach("file", Buffer.from("hist-view"), "hist-view.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    await admin.get(`/api/appointment-attachments/${attachmentId}/download`).expect(200);
  });

  it("GET-Liste eines historischen Termins → weiterhin erlaubt", async () => {
    const admin = await loginAdminAgent();
    const parent = await createHistoricalAppointmentParent();

    await admin
      .post(`/api/appointments/${parent.id}/attachments`)
      .attach("file", Buffer.from("hist-list"), "hist-list.pdf")
      .expect(201);

    const list = await admin.get(`/api/appointments/${parent.id}/attachments`).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });
});
