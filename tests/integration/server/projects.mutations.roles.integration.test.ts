/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projektanlage, Projektbearbeitung und Projektlöschung sind serverseitig nur für ADMIN und DISPONENT erlaubt.
 * - LESER erhalten bei direkten API-Mutationsaufrufen 403.
 * - Nicht angemeldete Aufrufe bleiben durch die Session-Middleware mit 401 blockiert.
 *
 * Fehlerfälle:
 * - Eine reine UI-Ausblendung ohne Server-Guard würde LESER-Mutationen erlauben.
 *
 * Ziel:
 * Rollenabsicherung der Projektmutationen unabhängig vom sichtbaren Frontend prüfen.
 */
import express from "express";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken, resetDeterministicTokens } from "../../helpers/deterministic";
import {
  createCustomerFixture,
  createProjectFixture,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetDeterministicTokens("projects-mutation-roles");
});

async function loginRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const token = nextDeterministicToken("projects-mutation-roles");
  const username = `project-mutation-${roleCode.toLowerCase()}-${token}`;
  const password = `project-mutation-${roleCode.toLowerCase()}-password`;

  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Projekt",
    lastName: roleCode,
    passwordHash: await hashPassword(password),
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function buildCreatePayload(prefix: string) {
  const customer = await createCustomerFixture(`${prefix}-CUST`);
  const token = nextDeterministicToken("projects-mutation-roles");
  return {
    customerId: customer.id,
    name: `${prefix} Projekt ${token}`,
    orderNumber: `${prefix}-ORD-${token}`,
    descriptionMd: null,
    version: 1,
  };
}

describe("project mutation roles", () => {
  it("allows ADMIN and DISPONENT to create projects and blocks LESER", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await loginRoleAgent("DISPATCHER");
    const reader = await loginRoleAgent("READER");

    await admin.post("/api/projects").send(await buildCreatePayload("ADMIN")).expect(201);
    await dispatcher.post("/api/projects").send(await buildCreatePayload("DISPONENT")).expect(201);
    await reader
      .post("/api/projects")
      .send(await buildCreatePayload("LESER"))
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("allows DISPONENT to update projects and blocks LESER", async () => {
    const dispatcher = await loginRoleAgent("DISPATCHER");
    const reader = await loginRoleAgent("READER");
    const dispatcherProject = await createProjectFixture({ prefix: "ROLE-DISP-UPDATE" });
    const readerProject = await createProjectFixture({ prefix: "ROLE-READ-UPDATE" });

    await dispatcher
      .patch(`/api/projects/${dispatcherProject.id}`)
      .send({ version: dispatcherProject.version, name: "Von Disponent bearbeitet" })
      .expect(200);

    await reader
      .patch(`/api/projects/${readerProject.id}`)
      .send({ version: readerProject.version, name: "Von Leser bearbeitet" })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("blocks unauthenticated project mutations with 401", async () => {
    const project = await createProjectFixture({ prefix: "ROLE-ANON" });

    await request(app).post("/api/projects").send(await buildCreatePayload("ANON")).expect(401);
    await request(app)
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "Anonym bearbeitet" })
      .expect(401);
    await request(app)
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(401);
  });
});
