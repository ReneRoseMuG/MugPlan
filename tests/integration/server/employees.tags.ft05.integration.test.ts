/**
 * Test Scope:
 *
 * Feature: FT05+/FT28 - Mitarbeiter-Tags
 * Use Case: Mitarbeiter-Tags lesen und verwalten
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter-Tags koennen gelesen, hinzugefuegt und entfernt werden.
 * - Die Mitarbeiterliste liefert Tags direkt im List-Response fuer Kartenprojektionen.
 * - Nicht-Admin/Nicht-Disponent darf Mitarbeiter-Tags nicht mutieren.
 *
 * Fehlerfaelle:
 * - Unbekannter Mitarbeiter liefert 404.
 * - Stale Relation-Version liefert 409 VERSION_CONFLICT.
 * - Leserrolle wird fuer Schreibzugriffe mit 403 blockiert.
 *
 * Ziel:
 * Die neue Mitarbeiter-Tag-API und die Listenprojektion end-to-end absichern.
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
let tagCounter = 0;

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
  const username = `employee-tags-reader-${nextDeterministicToken("employee-tags-reader")}`;
  const password = "employee-tags-reader-password";
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
  const response = await admin
    .post("/api/employees")
    .send({
      firstName: `Tag-${employeeCounter}`,
      lastName: "Employee",
      phone: null,
      email: null,
    })
    .expect(201);

  return response.body as { id: number };
}

async function createTag(admin: SuperAgentTest) {
  tagCounter += 1;
  const response = await admin
    .post("/api/admin/master-data/tags")
    .send({
      name: `EmployeeTag-${tagCounter}`,
      color: "#224466",
    })
    .expect(201);

  return response.body as { id: number; name: string };
}

describe("FT05+ integration: employee tags", () => {
  it("lists, adds and removes employee tags and reflects them in the employee list", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);
    const tag = await createTag(admin);

    await admin.get(`/api/employees/${employee.id}/tags`).expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });

    const added = await admin
      .post(`/api/employees/${employee.id}/tags`)
      .send({ tagId: tag.id })
      .expect(201);

    expect(added.body.tag.id).toBe(tag.id);
    expect(added.body.relationVersion).toBe(1);

    await admin.get(`/api/employees/${employee.id}/tags`).expect(200).expect(({ body }) => {
      expect(body).toMatchObject([
        {
          relationVersion: 1,
          tag: { id: tag.id, name: tag.name },
        },
      ]);
    });

    await admin.get("/api/employees?scope=active").expect(200).expect(({ body }) => {
      const row = (body as Array<{ id: number; tags: Array<{ id: number; name: string }> }>).find((entry) => entry.id === employee.id);
      expect(row).toBeDefined();
      expect(row?.tags).toMatchObject([{ id: tag.id, name: tag.name }]);
    });

    await admin
      .delete(`/api/employees/${employee.id}/tags/${tag.id}`)
      .send({ version: 1 })
      .expect(204);

    await admin.get("/api/employees?scope=active").expect(200).expect(({ body }) => {
      const row = (body as Array<{ id: number; tags: Array<{ id: number }> }>).find((entry) => entry.id === employee.id);
      expect(row).toBeDefined();
      expect(row?.tags).toEqual([]);
    });
  });

  it("returns 409 VERSION_CONFLICT when removing with a stale relation version", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);
    const tag = await createTag(admin);

    await admin
      .post(`/api/employees/${employee.id}/tags`)
      .send({ tagId: tag.id })
      .expect(201);

    await admin
      .delete(`/api/employees/${employee.id}/tags/${tag.id}`)
      .send({ version: 2 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("blocks reader role from mutating employee tags", async () => {
    const admin = await loginAdminAgent();
    const reader = await createReaderAgent();
    const employee = await createEmployee(admin);
    const tag = await createTag(admin);

    await reader
      .post(`/api/employees/${employee.id}/tags`)
      .send({ tagId: tag.id })
      .expect(403);
  });

  it("returns 404 for unknown employee tag list", async () => {
    const admin = await loginAdminAgent();

    await admin.get("/api/employees/999999/tags").expect(404);
  });
});
