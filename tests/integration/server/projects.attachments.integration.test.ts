/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/06
 *
 * Abgedeckte Regeln:
 * - Projektanhaenge koennen gelistet, hochgeladen und heruntergeladen werden.
 * - Delete fuer Projektanhaenge ist serverseitig deaktiviert (405).
 *
 * Fehlerfaelle:
 * - Upload auf unbekanntes Projekt soll 404 liefern (fachliche Soll-Anforderung).
 * - READER ohne Aenderungsrechte soll Upload mit 403 blockiert bekommen (fachliche Soll-Anforderung).
 *
 * Ziel:
 * Projektattachment-Flow als Ist plus fachliche Soll-Luecken transparent machen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
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
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function loginReaderAgent(): Promise<SuperAgentTest> {
  const suffix = `ft02-reader-${Date.now()}-${seq++}`;
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

async function createProjectForAttachments() {
  const token = `FT02-ATT-${Date.now()}-${seq++}`;
  const customer = await customersService.createCustomer({
    customerNumber: token,
    firstName: "Attach",
    lastName: token,
    fullName: `${token}, Attach`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  return projectsService.createProject({
    customerId: customer.id,
    name: "Attachment Project",
    descriptionMd: null,
    version: 1,
  });
}

describe("FT02 integration: project attachments", () => {
  it("UC 02/06 happy path: list, upload, open, download and delete=405", async () => {
    const admin = await loginAdminAgent();
    const project = await createProjectForAttachments();

    const initialList = await admin.get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(Array.isArray(initialList.body)).toBe(true);
    expect(initialList.body).toHaveLength(0);

    const upload = await admin
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 test"), "angebot.pdf")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    expect(Number.isInteger(attachmentId)).toBe(true);
    expect(upload.body.projectId).toBe(project.id);

    const list = await admin.get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(attachmentId);

    const openResponse = await admin
      .get(`/api/project-attachments/${attachmentId}/download`)
      .expect(200);
    expect(String(openResponse.headers["content-disposition"] ?? "")).toContain("inline");

    const forcedDownload = await admin
      .get(`/api/project-attachments/${attachmentId}/download?download=1`)
      .expect(200);
    expect(String(forcedDownload.headers["content-disposition"] ?? "")).toContain("attachment");

    await admin
      .delete(`/api/project-attachments/${attachmentId}`)
      .expect(405)
      .expect((res) => {
        expect(res.body.message).toBe("Attachment deletion is disabled");
      });
  });

  it("UC 02/06 negative requirement: unknown project upload should return 404", async () => {
    const admin = await loginAdminAgent();

    await admin
      .post("/api/projects/999999999/attachments")
      .attach("file", Buffer.from("x"), "x.pdf")
      .expect(404);
  });

  it("UC 02/06 negative requirement: READER upload should be blocked with 403", async () => {
    const reader = await loginReaderAgent();
    const project = await createProjectForAttachments();

    await reader
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("reader"), "reader.pdf")
      .expect(403);
  });
});
