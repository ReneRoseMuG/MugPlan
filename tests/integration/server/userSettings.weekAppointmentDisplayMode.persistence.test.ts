/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Darstellungsmodus
 * Use Case: UC FT03 - User-spezifische Persistenz des globalen Wochenmodus
 *
 * Abgedeckte Regeln:
 * - Der globale Wochenmodus wird pro Benutzer getrennt gespeichert.
 * - Persistierte Werte bleiben ueber erneutes Laden der resolved Settings erhalten.
 * - Ohne Persistenz wird der Default standard geliefert.
 *
 * Fehlerfaelle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Verlust persistierter Werte bei erneutem Laden.
 *
 * Ziel:
 * Integration der globalen Wochenmodus-Praeferenz auf API-Ebene gegen FT18-Persistenz absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
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
  const username = `test-week-mode-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-week-mode-password-${label}`;
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

describe("FT03 integration: week appointment display mode persistence", () => {
  it("persists the week display mode user-specifically and keeps values across reload", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await setUserSetting(userA, "calendar.weekAppointmentDisplayMode", "compact");

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "calendar.weekAppointmentDisplayMode").resolvedValue).toBe("compact");
    expect(getSetting(settingsB, "calendar.weekAppointmentDisplayMode").resolvedValue).toBe("standard");

    const reloadedA = await getResolvedSettings(userA);
    expect(getSetting(reloadedA, "calendar.weekAppointmentDisplayMode").resolvedValue).toBe("compact");
  });

  it("supports distinct persisted values across users", async () => {
    const userA = await createDispatcherAgent("x");
    const userB = await createDispatcherAgent("y");

    await setUserSetting(userA, "calendar.weekAppointmentDisplayMode", "detail");
    await setUserSetting(userB, "calendar.weekAppointmentDisplayMode", "compact");

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "calendar.weekAppointmentDisplayMode").resolvedValue).toBe("detail");
    expect(getSetting(settingsB, "calendar.weekAppointmentDisplayMode").resolvedValue).toBe("compact");
  });
});
