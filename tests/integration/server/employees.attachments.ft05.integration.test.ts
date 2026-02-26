/**
 * Test Scope:
 *
 * Feature: FT05 - Mitarbeiteranhaenge
 * Use Case: UC 05/06 Mitarbeiteranhaenge verwalten
 *
 * Abgedeckte Regeln:
 * - Attachments koennen fuer Mitarbeiter hochgeladen, gelistet und heruntergeladen werden.
 * - Upload prueft employeeId-Parameter sowie Payload-Groesse.
 * - Rollen- und NotFound-Sollregeln werden als HTTP-Integration verifiziert.
 *
 * Fehlerfaelle:
 * - Ungueltige employeeId liefert 400.
 * - Zu grosse Datei liefert 413.
 * - Unbekannter Mitarbeiter soll 404 liefern.
 * - Unberechtigte Rolle soll 403 liefern.
 * - DELETE auf Employee-Attachments soll blockiert werden (403/405).
 *
 * Ziel:
 * FT05 Attachment-Flow end-to-end absichern und Soll-Ist-Luecken transparent machen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let employeeCounter = 0;

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

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `test-reader-${nextDeterministicToken("employees-attachments-reader")}`;
  const password = "test-reader-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createEmployee(admin: SuperAgentTest) {
  employeeCounter += 1;
  const res = await admin
    .post("/api/employees")
    .send({
      firstName: `Attach-${employeeCounter}`,
      lastName: "Employee",
      phone: null,
      email: null,
    })
    .expect(201);

  return res.body as { id: number };
}

describe("FT05 integration: employee attachments", () => {
  it("uploads, lists and downloads employee attachment", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    const initial = await admin.get(`/api/employees/${employee.id}/attachments`).expect(200);
    expect(Array.isArray(initial.body)).toBe(true);
    expect(initial.body).toHaveLength(0);

    const upload = await admin
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", Buffer.from("Employee attachment"), "mitarbeiter.txt")
      .expect(201);

    const attachmentId = Number(upload.body.id);
    expect(Number.isInteger(attachmentId)).toBe(true);
    expect(upload.body.employeeId).toBe(employee.id);

    await admin
      .get(`/api/employees/${employee.id}/attachments`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(attachmentId);
      });

    await admin
      .get(`/api/employee-attachments/${attachmentId}/download`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-disposition"] ?? "")).toContain("inline");
      });

    await admin
      .get(`/api/employee-attachments/${attachmentId}/download?download=1`)
      .expect(200)
      .expect((res) => {
        expect(String(res.headers["content-disposition"] ?? "")).toContain("attachment");
      });
  });

  it("returns 400 for invalid employeeId in list and create routes", async () => {
    const admin = await loginAdminAgent();

    await admin.get("/api/employees/not-a-number/attachments").expect(400);
    await admin
      .post("/api/employees/not-a-number/attachments")
      .attach("file", Buffer.from("x"), "x.txt")
      .expect(400);
  });

  it("returns 413 for oversized upload payload", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await admin
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", tooLarge, "too-large.bin")
      .expect(413);
  });

  it("UC 05/06 Solltest: unknown employee upload should return 404", async () => {
    const admin = await loginAdminAgent();

    await admin
      .post("/api/employees/999999/attachments")
      .attach("file", Buffer.from("ghost"), "ghost.txt")
      .expect(404);
  });

  it("UC 05/06 Solltest: reader role must be blocked for upload with 403", async () => {
    const admin = await loginAdminAgent();
    const reader = await createReaderAgent();
    const employee = await createEmployee(admin);

    await reader
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", Buffer.from("reader"), "reader.txt")
      .expect(403);
  });

  it("UC 05/06 Melder: DELETE requests on employee attachments must be blocked with 403 or 405", async () => {
    const admin = await loginAdminAgent();

    const response = await admin.delete("/api/employee-attachments/123456");
    if (response.status !== 403 && response.status !== 405) {
      throw new Error(
        "UC 05/06 not fulfilled: DELETE /api/employee-attachments/:id is not blocked with 403/405. " +
          "Required production extension: explicit delete-blocking endpoint/handler for employee attachments.",
      );
    }
  });
});
