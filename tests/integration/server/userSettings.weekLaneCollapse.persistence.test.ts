/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Lane-Kollaps
 * Use Case: UC FT03 - User-spezifische Persistenz ueber FT18
 *
 * Abgedeckte Regeln:
 * - Die FT03-Lane-Settings werden pro Benutzer getrennt gespeichert.
 * - Persistierte Werte bleiben ueber erneutes Laden der resolved Settings erhalten.
 * - Ein ungueltiger persisted expandedLaneId-Wert kann deterministisch korrigiert werden.
 *
 * Fehlerfaelle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Verlust persistierter Werte bei erneutem Laden.
 *
 * Ziel:
 * Integration der FT03-Preferences auf API-Ebene gegen FT18-Persistenz absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { resetDatabase } from "../../helpers/resetDatabase";
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
  await resetDatabase();
  userCounter = 1;
});

async function createDispatcherAgent(label: string): Promise<SuperAgentTest> {
  const username = `test-dispatcher-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-dispatcher-password-${label}`;
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

describe("FT03 integration: week lane settings persistence", () => {
  it("persists lane settings user-specifically and keeps values across reload", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await setUserSetting(userA, "calendar.weekLanes.expandedLaneId", "tour-7");
    await setUserSetting(userA, "calendar.weekLanes.isCollapsed", true);

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "calendar.weekLanes.isCollapsed").resolvedValue).toBe(true);
    expect(getSetting(settingsA, "calendar.weekLanes.expandedLaneId").resolvedValue).toBe("tour-7");

    expect(getSetting(settingsB, "calendar.weekLanes.isCollapsed").resolvedValue).toBe(false);
    expect(getSetting(settingsB, "calendar.weekLanes.expandedLaneId").resolvedValue).toBe("");

    const reloadedA = await getResolvedSettings(userA);
    expect(getSetting(reloadedA, "calendar.weekLanes.isCollapsed").resolvedValue).toBe(true);
    expect(getSetting(reloadedA, "calendar.weekLanes.expandedLaneId").resolvedValue).toBe("tour-7");
  });

  it("supports correction flow from invalid to valid expandedLaneId", async () => {
    const user = await createDispatcherAgent("correction");

    await setUserSetting(user, "calendar.weekLanes.expandedLaneId", "tour-invalid");
    await setUserSetting(user, "calendar.weekLanes.isCollapsed", true);
    await setUserSetting(user, "calendar.weekLanes.expandedLaneId", "tour-1");

    const settings = await getResolvedSettings(user);
    expect(getSetting(settings, "calendar.weekLanes.isCollapsed").resolvedValue).toBe(true);
    expect(getSetting(settings, "calendar.weekLanes.expandedLaneId").resolvedValue).toBe("tour-1");
  });
});
