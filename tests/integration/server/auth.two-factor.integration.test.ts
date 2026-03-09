/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Global aktivierte 2FA zwingt Benutzer zuerst in Setup und danach in den 2FA-Login.
 * - Nur ADMIN darf den globalen 2FA-Schalter setzen.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann globale 2FA veraendern.
 * - Login umgeht den verpflichtenden 2FA-Schritt trotz aktivierter globaler Einstellung.
 *
 * Ziel:
 * Den globalen FT-29-Flow von Admin-Schalter bis erfolgreicher Benutzeranmeldung auf API-Ebene absichern.
 */

import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { generate } from "otplib";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
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

async function createRoleAgent(roleCode: "ADMIN" | "DISPATCHER"): Promise<{ agent: SuperAgentTest; username: string; password: string }> {
  const username = `ft29-${roleCode.toLowerCase()}-${userCounter}`;
  userCounter += 1;
  const password = `ft29-${roleCode.toLowerCase()}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT29",
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

describe("FT29 integration: global two-factor auth", () => {
  it("keeps login single-step while global 2FA is disabled", async () => {
    const user = await createRoleAgent("DISPATCHER");
    const freshAgent = request.agent(app);

    const response = await freshAgent.post("/api/auth/login").send({
      username: user.username,
      password: user.password,
    }).expect(200);

    expect(response.body).toMatchObject({
      status: "authenticated",
      username: user.username,
      roleCode: "DISPATCHER",
    });
  });

  it("forces setup first and then code verification on later logins", async () => {
    const admin = await createRoleAgent("ADMIN");
    const user = await createRoleAgent("DISPATCHER");
    await setGlobalTwoFactor(admin.agent, true);

    const setupAgent = request.agent(app);
    const firstLogin = await setupAgent.post("/api/auth/login").send({
      username: user.username,
      password: user.password,
    }).expect(200);

    expect(firstLogin.body.status).toBe("2fa_setup_required");
    const setupCode = await generate({ secret: firstLogin.body.manualEntryKey });

    const setupVerify = await setupAgent.post("/api/auth/2fa/setup/verify").send({
      code: setupCode,
    }).expect(200);
    expect(setupVerify.body.status).toBe("authenticated");

    await setupAgent.post("/api/auth/logout").expect(200);

    const verifyAgent = request.agent(app);
    const secondLogin = await verifyAgent.post("/api/auth/login").send({
      username: user.username,
      password: user.password,
    }).expect(200);
    expect(secondLogin.body).toEqual({
      status: "2fa_required",
      username: user.username,
    });

    const verifyCode = await generate({ secret: firstLogin.body.manualEntryKey });
    const verified = await verifyAgent.post("/api/auth/2fa/verify").send({
      code: verifyCode,
    }).expect(200);
    expect(verified.body).toMatchObject({
      status: "authenticated",
      username: user.username,
      roleCode: "DISPATCHER",
    });
  });

  it("rejects non-admin writes to the global two-factor setting", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const resolved = await dispatcher.agent.get("/api/user-settings/resolved").expect(200);
    const setting = (resolved.body as Array<{ key: string; globalVersion?: number }>).find(
      (entry) => entry.key === "auth_two_factor_enabled",
    );
    if (!setting) {
      throw new Error("auth_two_factor_enabled missing");
    }

    await dispatcher.agent.patch("/api/user-settings").send({
      key: "auth_two_factor_enabled",
      scopeType: "GLOBAL",
      version: setting.globalVersion ?? 1,
      value: true,
    }).expect(403);
  });
});
