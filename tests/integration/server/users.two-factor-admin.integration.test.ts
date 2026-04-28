/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ADMIN kann bestehende Benutzer bearbeiten, ohne Rechte fuer Nicht-Admins zu erweitern.
 * - ADMIN kann 2FA fuer einzelne Benutzer zuruecksetzen, ohne Passwort oder Rolle zu veraendern.
 * - Global aktive 2FA sperrt Benutzer mit inkonsistentem Secret nicht unaufloesbar aus.
 *
 * Fehlerfaelle:
 * - Nicht-Admins koennen Benutzerdaten oder 2FA-Zustaende anderer Benutzer mutieren.
 * - Inkonsistente Secret-Payload fuehrt in den Verify-Pfad statt in einen Setup-Pfad.
 *
 * Ziel:
 * Die kombinierte Admin-Benutzerpflege und den robusten 2FA-Reset-/Recovery-Flow integrativ absichern.
 */

import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { generate } from "otplib";
import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let userCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(() => {
  userCounter = 1;
});

async function createRoleAgent(roleCode: "ADMIN" | "DISPATCHER" | "READER"): Promise<{ agent: SuperAgentTest; username: string; password: string }> {
  const username = `ft31-${roleCode.toLowerCase()}-${userCounter}`;
  userCounter += 1;
  const password = `ft31-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT31",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  const loginResponse = await agent.post("/api/auth/login").send({ username, password }).expect(200);
  expect(loginResponse.body.status).toBe("authenticated");
  return { agent, username, password };
}

async function setGlobalTwoFactor(agent: SuperAgentTest, enabled: boolean): Promise<void> {
  const resolvedResponse = await agent.get("/api/user-settings/resolved").expect(200);
  const setting = (resolvedResponse.body as Array<{ key: string; globalVersion?: number }>).find(
    (entry) => entry.key === "auth_two_factor_enabled",
  );
  if (!setting) {
    throw new Error("auth_two_factor_enabled missing");
  }

  await agent.patch("/api/user-settings").send({
    key: "auth_two_factor_enabled",
    scopeType: "GLOBAL",
    version: setting.globalVersion ?? 1,
    value: enabled,
  }).expect(200);
}

async function listUsers(agent: SuperAgentTest) {
  const response = await agent.get("/api/users").expect(200);
  return response.body as Array<{
    id: number;
    version: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    isActive: boolean;
    hasTwoFactorSecret: boolean;
    roleCode: "ADMIN" | "DISPATCHER" | "READER" | null;
  }>;
}

describe("FT31 integration: admin user management and 2FA recovery", () => {
  it("allows admin to edit an existing user entry", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const usersBefore = await listUsers(admin.agent);
    const target = usersBefore.find((entry) => entry.username === dispatcher.username);
    expect(target).toBeTruthy();

    const updatedUsername = `${dispatcher.username}-edit`;
    const updatedEmail = `${updatedUsername}@local.test`;

    const updateResponse = await admin.agent
      .patch(`/api/users/${target!.id}`)
      .send({
        username: updatedUsername,
        email: updatedEmail,
        firstName: "Geaendert",
        lastName: "Dispatcher",
        roleCode: "DISPATCHER",
        isActive: true,
        version: target!.version,
      })
      .expect(200);

    const updated = (updateResponse.body as typeof usersBefore).find((entry) => entry.id === target!.id);
    expect(updated).toMatchObject({
      username: updatedUsername,
      email: updatedEmail,
      firstName: "Geaendert",
      lastName: "Dispatcher",
      fullName: "Geaendert Dispatcher",
      roleCode: "DISPATCHER",
      isActive: true,
    });

    const relogin = await request.agent(app)
      .post("/api/auth/login")
      .send({ username: updatedUsername, password: dispatcher.password })
      .expect(200);
    expect(relogin.body.status).toBe("authenticated");
  });

  it("allows admin to change an existing user's password", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const usersBefore = await listUsers(admin.agent);
    const target = usersBefore.find((entry) => entry.username === dispatcher.username);
    expect(target).toBeTruthy();

    const newPassword = "ft31-dispatcher-password-new";
    await admin.agent
      .patch(`/api/users/${target!.id}`)
      .send({
        username: dispatcher.username,
        email: `${dispatcher.username}@local.test`,
        firstName: "FT31",
        lastName: "DISPATCHER",
        roleCode: "DISPATCHER",
        isActive: true,
        password: newPassword,
        version: target!.version,
      })
      .expect(200);

    await request.agent(app)
      .post("/api/auth/login")
      .send({ username: dispatcher.username, password: dispatcher.password })
      .expect(401);

    const relogin = await request.agent(app)
      .post("/api/auth/login")
      .send({ username: dispatcher.username, password: newPassword })
      .expect(200);
    expect(relogin.body.status).toBe("authenticated");
  });

  it("rejects non-admin edits and 2FA resets", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const usersBefore = await listUsers(admin.agent);
    const target = usersBefore.find((entry) => entry.username === admin.username);
    expect(target).toBeTruthy();

    await dispatcher.agent
      .patch(`/api/users/${target!.id}`)
      .send({
        username: admin.username,
        email: `${admin.username}@local.test`,
        firstName: "FT31",
        lastName: "ADMIN",
        roleCode: "ADMIN",
        isActive: true,
        version: target!.version,
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("LOCK_VIOLATION");
      });

    await dispatcher.agent
      .post(`/api/users/${target!.id}/reset-2fa`)
      .send({ version: target!.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("LOCK_VIOLATION");
      });
  });

  it("resets 2FA for a single user without changing password or role", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    await setGlobalTwoFactor(admin.agent, true);

    const setupAgent = request.agent(app);
    const firstLogin = await setupAgent.post("/api/auth/login").send({
      username: dispatcher.username,
      password: dispatcher.password,
    }).expect(200);
    expect(firstLogin.body.status).toBe("2fa_setup_required");

    const setupCode = await generate({ secret: firstLogin.body.manualEntryKey });
    await setupAgent.post("/api/auth/2fa/setup/verify").send({
      code: setupCode,
    }).expect(200);
    await setupAgent.post("/api/auth/logout").expect(200);

    const usersBeforeReset = await listUsers(admin.agent);
    const target = usersBeforeReset.find((entry) => entry.username === dispatcher.username);
    expect(target?.hasTwoFactorSecret).toBe(true);

    const resetResponse = await admin.agent
      .post(`/api/users/${target!.id}/reset-2fa`)
      .send({ version: target!.version })
      .expect(200);

    const updated = (resetResponse.body as typeof usersBeforeReset).find((entry) => entry.id === target!.id);
    expect(updated).toMatchObject({
      roleCode: "DISPATCHER",
      isActive: true,
      hasTwoFactorSecret: false,
    });

    const relogin = await request.agent(app)
      .post("/api/auth/login")
      .send({ username: dispatcher.username, password: dispatcher.password })
      .expect(200);
    expect(relogin.body.status).toBe("2fa_setup_required");
  });

  it("routes users with a broken secret back into setup instead of blocking verify", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    await setGlobalTwoFactor(admin.agent, true);

    await db.execute(sql`
      update users
      set
        two_factor_secret_encrypted = ${"broken-payload"},
        updated_at = now(),
        version = version + 1
      where username = ${dispatcher.username}
    `);

    const response = await request.agent(app)
      .post("/api/auth/login")
      .send({ username: dispatcher.username, password: dispatcher.password })
      .expect(200);

    expect(response.body.status).toBe("2fa_setup_required");
    expect(response.body.username).toBe(dispatcher.username);
  });
});
