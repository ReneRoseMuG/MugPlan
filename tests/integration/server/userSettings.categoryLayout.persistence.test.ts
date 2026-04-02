/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - reports.categoryLayout wird global persistiert und steht nach dem Speichern allen Rollen in resolved settings zur Verfuegung.
 * - Nur ADMIN darf das globale Kategorie-Layout schreiben.
 * - Ungueltige Layout-Payloads werden serverseitig abgewiesen.
 *
 * Fehlerfaelle:
 * - Dispatcher kann globale Layout-Aenderungen speichern.
 * - Persistierte Layout-Bloecke gehen nach erneutem Laden verloren.
 * - Ungueltige Spalten oder doppelte Kategorien werden akzeptiert.
 *
 * Ziel:
 * Die globale Persistenz und Rollenabsicherung des Kategorie-Layouts auf API-Ebene absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { registerRoutes } from "../../../server/routes";
import { hashPassword } from "../../../server/security/passwordHash";

type ResolvedSetting = {
  key: string;
  globalVersion?: number;
  resolvedValue: unknown;
};

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

async function createRoleAgent(roleCode: "ADMIN" | "DISPATCHER"): Promise<SuperAgentTest> {
  const username = `test-category-layout-${roleCode.toLowerCase()}-${userCounter}`;
  userCounter += 1;
  const password = `test-category-layout-password-${roleCode.toLowerCase()}`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function getResolvedSettings(agent: SuperAgentTest): Promise<ResolvedSetting[]> {
  const response = await agent.get("/api/user-settings/resolved").expect(200);
  return response.body as ResolvedSetting[];
}

function getSetting(settings: ResolvedSetting[], key: string): ResolvedSetting {
  const setting = settings.find((entry) => entry.key === key);
  if (!setting) {
    throw new Error(`Setting not found: ${key}`);
  }
  return setting;
}

async function setGlobalCategoryLayout(agent: SuperAgentTest, value: unknown, expectedStatus = 200): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, "reports.categoryLayout");

  await agent.patch("/api/user-settings").send({
    key: "reports.categoryLayout",
    scopeType: "GLOBAL",
    version: setting.globalVersion ?? 1,
    value,
  }).expect(expectedStatus);
}

describe("integration: reports.categoryLayout persistence", () => {
  it("persists the global layout and exposes it through resolved settings", async () => {
    const admin = await createRoleAgent("ADMIN");
    const dispatcher = await createRoleAgent("DISPATCHER");
    const layout = [
      { categoryId: 11, block: 1, columns: 2 },
      { categoryId: 12, block: 1, columns: 3 },
      { categoryId: 21, block: 2, columns: 1 },
    ];

    await setGlobalCategoryLayout(admin, layout);

    const adminResolved = await getResolvedSettings(admin);
    const dispatcherResolved = await getResolvedSettings(dispatcher);

    expect(getSetting(adminResolved, "reports.categoryLayout").resolvedValue).toEqual(layout);
    expect(getSetting(dispatcherResolved, "reports.categoryLayout").resolvedValue).toEqual(layout);
  });

  it("rejects dispatcher writes to the global layout setting", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");

    await setGlobalCategoryLayout(dispatcher, [{ categoryId: 11, block: 1, columns: 2 }], 403);
  });

  it("rejects invalid layout payloads for admins", async () => {
    const admin = await createRoleAgent("ADMIN");

    await setGlobalCategoryLayout(admin, [
      { categoryId: 11, block: 1, columns: 2 },
      { categoryId: 11, block: 2, columns: 1 },
    ], 400);
  });
});
