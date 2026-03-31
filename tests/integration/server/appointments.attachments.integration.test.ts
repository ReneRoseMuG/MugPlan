/**
 * Test Scope:
 *
 * Feature: FT24 - Terminanhaenge
 * Use Case: UC Terminanhaenge hochladen, listen und herunterladen
 *
 * Abgedeckte Regeln:
 * - Terminanhaenge koennen gelistet, hochgeladen und heruntergeladen werden.
 * - Upload ist nur fuer ADMIN und DISPONENT erlaubt.
 * - Delete fuer Terminanhaenge entfernt den Anhang per Soft-Delete aus der Liste.
 * - Downloads bleiben auch mit Legacy-storagePath in der Datenbank verfuegbar.
 * - Ungueltige oder fehlende Terminbeziehungen sowie zu grosse Payloads liefern die erwarteten Fehlercodes.
 *
 * Fehlerfaelle:
 * - Upload ohne Session liefert nicht 401.
 * - READER kann unberechtigt Terminanhaenge hochladen.
 * - Upload auf unbekannten Termin liefert nicht 404.
 *
 * Ziel:
 * Den Terminattachment-Flow end-to-end inklusive Rollenmatrix und Download-Varianten absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import * as schema from "@shared/schema";
import { db } from "../../../server/db";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
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

async function loginRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const suffix = `ft24-${roleCode.toLowerCase()}-${Date.now()}-${seq++}`;
  const username = `test-${suffix}`;
  const password = `pw-${suffix}`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${suffix}@local.test`,
    firstName: roleCode,
    lastName: suffix,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createAppointmentForAttachments() {
  const token = `FT24-APP-ATT-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Termin",
    lastName: token,
    fullName: `${token}, Termin`,
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
    name: `Termin Attachment Projekt ${token}`,
    orderNumber: `ORD-${token}`,
    descriptionMd: null,
    version: 1,
  });

  return appointmentsService.createAppointment({
    projectId: project.id,
    startDate: "2099-03-15",
    endDate: null,
    startTime: null,
    employeeIds: [],
  });
}

describe("FT24 integration: appointment attachments", () => {
  it("supports admin/dispatcher upload plus list, open, download and soft-delete", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await loginRoleAgent("DISPATCHER");
    const appointment = await createAppointmentForAttachments();
    expect(appointment?.id).toBeTruthy();

    const initialList = await admin.get(`/api/appointments/${appointment?.id}/attachments`).expect(200);
    expect(Array.isArray(initialList.body)).toBe(true);
    expect(initialList.body).toHaveLength(0);

    const adminUpload = await admin
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 termin-admin"), "termin-admin.pdf")
      .expect(201);

    const dispatcherUpload = await dispatcher
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", Buffer.from("dispatcher-image"), "termin-dispatcher.png")
      .expect(201);

    const adminAttachmentId = Number(adminUpload.body.id);
    const dispatcherAttachmentId = Number(dispatcherUpload.body.id);
    expect(Number.isInteger(adminAttachmentId)).toBe(true);
    expect(Number.isInteger(dispatcherAttachmentId)).toBe(true);

    const list = await admin.get(`/api/appointments/${appointment?.id}/attachments`).expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.some((row: { id: number }) => row.id === adminAttachmentId)).toBe(true);
    expect(list.body.some((row: { id: number }) => row.id === dispatcherAttachmentId)).toBe(true);

    await admin
      .get(`/api/appointment-attachments/${adminAttachmentId}/download`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-type"] ?? "")).toContain("application/pdf");
        expect(String(res.headers["content-disposition"] ?? "")).toContain("inline");
      });

    await admin
      .get(`/api/appointment-attachments/${dispatcherAttachmentId}/download?download=1`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-disposition"] ?? "")).toContain("attachment");
      });

    await admin
      .delete(`/api/appointment-attachments/${adminAttachmentId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe("Anhang geloescht");
      });

    const afterDelete = await admin.get(`/api/appointments/${appointment?.id}/attachments`).expect(200);
    expect(afterDelete.body).toHaveLength(1);
    expect(afterDelete.body[0].id).toBe(dispatcherAttachmentId);
  });

  it("downloads attachments via current upload root even when storagePath still points to a legacy directory", async () => {
    const admin = await loginAdminAgent();
    const appointment = await createAppointmentForAttachments();
    expect(appointment?.id).toBeTruthy();

    const upload = await admin
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", Buffer.from("legacy-storage-path"), "legacy-storage.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    const [storedAttachment] = await db
      .select()
      .from(schema.appointmentAttachments)
      .where(eq(schema.appointmentAttachments.id, attachmentId));

    await db
      .update(schema.appointmentAttachments)
      .set({
        storagePath: `/legacy/shared/uploads/${storedAttachment.filename}`,
      })
      .where(eq(schema.appointmentAttachments.id, attachmentId));

    await admin
      .get(`/api/appointment-attachments/${attachmentId}/download?download=1`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-disposition"] ?? "")).toContain("attachment");
      });
  });

  it("enforces 401, 403, 404 and 413 for invalid appointment attachment mutations", async () => {
    const admin = await loginAdminAgent();
    const reader = await loginRoleAgent("READER");
    const appointment = await createAppointmentForAttachments();
    expect(appointment?.id).toBeTruthy();

    await request(app)
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", Buffer.from("anon"), "anon.pdf")
      .expect(401);

    await reader
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", Buffer.from("reader"), "reader.pdf")
      .expect(403);

    await admin
      .post("/api/appointments/999999999/attachments")
      .attach("file", Buffer.from("missing"), "missing.pdf")
      .expect(404);

    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await admin
      .post(`/api/appointments/${appointment?.id}/attachments`)
      .attach("file", tooLarge, "too-large.bin")
      .expect(413);
  });
});
