/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Abwesenheitsspur
 * Use Case: User-spezifische Persistenz über FT18
 *
 * Abgedeckte Regeln:
 * - Das Absence-Lane-Setting wird pro Benutzer getrennt gespeichert.
 * - Persistierte Werte bleiben über erneutes Laden der resolved Settings erhalten.
 * - Der Default bleibt expandiert, solange kein User-Wert gesetzt ist.
 *
 * Fehlerfälle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Verlust persistierter Werte bei erneutem Laden.
 *
 * Ziel:
 * Integration der Absence-Lane-Preference auf API-Ebene gegen FT18-Persistenz absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

type ResolvedSetting = {
  key: string;
  resolvedValue: unknown;
  userVersion?: number;
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

beforeEach(async () => {
  userCounter = 1;
});

async function createDispatcherAgent(label: string): Promise<SuperAgentTest> {
  const username = `test-absence-lane-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-absence-lane-password-${label}`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Dispatcher",
    passwordHash,
    roleCode: "DISPATCHER",
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

async function setUserSetting(agent: SuperAgentTest, key: string, value: unknown): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, key);
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1 ? setting.userVersion : 1;

  await agent
    .patch("/api/user-settings")
    .send({
      key,
      scopeType: "USER",
      version,
      value,
    })
    .expect(200);
}

describe("FT03 integration: week absence lane setting persistence", () => {
  it("persists collapsed absence lane per user and keeps booleans across reload", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await setUserSetting(userA, "calendar.weekAbsenceLane.collapsed", true);

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "calendar.weekAbsenceLane.collapsed").resolvedValue).toBe(true);
    expect(getSetting(settingsB, "calendar.weekAbsenceLane.collapsed").resolvedValue).toBe(false);

    const reloadedA = await getResolvedSettings(userA);
    expect(getSetting(reloadedA, "calendar.weekAbsenceLane.collapsed").resolvedValue).toBe(true);
  });
});
