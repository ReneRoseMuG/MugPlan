/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenverwaltung
 * Use Case: UC Rollenbasierte Tour-Operationen
 *
 * Abgedeckte Regeln:
 * - READER darf laut Soll keine Touren anlegen, bearbeiten oder loeschen.
 * - DISPATCHER darf Touren anlegen/bearbeiten, aber nicht loeschen.
 * - ADMIN darf Tour-CRUD und Tour-Mitarbeiteroperationen ausfuehren.
 *
 * Fehlerfaelle:
 * - Fehlende serverseitige 403-Guards werden als fehlschlagende Solltests sichtbar.
 *
 * Ziel:
 * Rollenverhalten fuer FT04 als Ist-Zustand erfassen und serverseitige 403-Pruefung explizit testen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let userCounter = 1;
let employeeCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  userCounter = 1;
  employeeCounter = 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createRoleAgent(roleCode: "READER" | "DISPATCHER"): Promise<SuperAgentTest> {
  const idx = userCounter++;
  const username = `ft04-${roleCode.toLowerCase()}-${idx}`;
  const password = `ft04-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);

  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT04",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  return loginAgent(username, password);
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAgent("test-admin", "test-admin-password");
}

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent
    .post("/api/employees")
    .send({ firstName: `Role-${idx}`, lastName: `Emp-${idx}`, phone: null, email: null })
    .expect(201);
  return response.body as { id: number; version: number };
}

describe("FT04 integration: RoleTests", () => {
  it("enforces READER create/update/delete restrictions with server-side 403", async () => {
    const reader = await createRoleAgent("READER");

    await reader.post("/api/tours").send({ color: "#aa0000" }).expect(403);

    const createForUpdate = await reader.post("/api/tours").send({ color: "#00aa00" });
    const id = createForUpdate.body?.id ?? 1;
    const version = createForUpdate.body?.version ?? 1;

    await reader.patch(`/api/tours/${id}`).send({ color: "#0000aa", version }).expect(403);
    await reader.delete(`/api/tours/${id}`).send({ version }).expect(403);
  });

  it("allows DISPATCHER to create/update tours but blocks delete", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");

    const created = await dispatcher.post("/api/tours").send({ color: "#1111aa" }).expect(201);
    const updated = await dispatcher
      .patch(`/api/tours/${created.body.id}`)
      .send({ color: "#22aa22", version: created.body.version })
      .expect(200);

    await dispatcher.delete(`/api/tours/${created.body.id}`).send({ version: updated.body.version }).expect(403);
  });

  it("allows ADMIN to perform tour CRUD and tour-employee operations", async () => {
    const admin = await loginAdminAgent();

    const created = await admin.post("/api/tours").send({ color: "#334455" }).expect(201);
    const updated = await admin
      .patch(`/api/tours/${created.body.id}`)
      .send({ color: "#445566", version: created.body.version })
      .expect(200);

    const employee = await createEmployee(admin);

    const assign = await admin
      .post(`/api/tours/${created.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    await admin
      .delete(`/api/tours/${created.body.id}/employees/${employee.id}`)
      .send({ version: assign.body[0].version })
      .expect(200);

    await admin.delete(`/api/tours/${created.body.id}`).send({ version: updated.body.version }).expect(204);
  });
});
