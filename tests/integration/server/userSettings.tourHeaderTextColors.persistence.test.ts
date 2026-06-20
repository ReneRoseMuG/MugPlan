/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Standardwert von calendar.tourHeaderTextColors ist ein leeres Objekt.
 * - Eine gespeicherte tourId→Hex-Farbe-Map bleibt nach erneutem Laden erhalten.
 * - Die Einstellung ist pro Benutzer getrennt (USER-Scope).
 * - Ungültige Werte werden vom Endpunkt abgelehnt.
 *
 * Fehlerfälle:
 * - Scope-Leak: Benutzer B sieht die Einstellung von Benutzer A.
 * - Persistierter Wert geht bei erneutem Laden verloren.
 * - Ungültige Hex-Werte oder nicht-numerische Schlüssel werden akzeptiert.
 *
 * Ziel:
 * Integration des calendar.tourHeaderTextColors-Settings auf API-Ebene gegen USER-Scope-Persistenz absichern.
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

beforeEach(() => {
  userCounter += 1;
});

async function createDispatcherAgent(label: string): Promise<SuperAgentTest> {
  const username = `test-dispatcher-thtc-${label}-${userCounter}`;
  const password = `test-password-thtc-${label}`;
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
  if (!setting) throw new Error(`Setting not found: ${key}`);
  return setting;
}

async function setUserSetting(agent: SuperAgentTest, key: string, value: unknown): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, key);
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1
    ? setting.userVersion
    : 1;
  await agent
    .patch("/api/user-settings")
    .send({ key, scopeType: "USER", version, value })
    .expect(200);
}

describe("calendar.tourHeaderTextColors integration: USER-Scope-Persistenz", () => {
  it("liefert ein leeres Objekt als Standardwert für neue Benutzer", async () => {
    const user = await createDispatcherAgent("default");
    const settings = await getResolvedSettings(user);
    const entry = getSetting(settings, "calendar.tourHeaderTextColors");
    expect(entry.resolvedValue).toEqual({});
  });

  it("persistiert eine tourId-zu-Farbe-Map und stellt sie nach erneutem Laden bereit", async () => {
    const user = await createDispatcherAgent("persist");
    await setUserSetting(user, "calendar.tourHeaderTextColors", { "7": "#cc3300", "12": "#004488" });
    const settings = await getResolvedSettings(user);
    expect(getSetting(settings, "calendar.tourHeaderTextColors").resolvedValue).toEqual({
      "7": "#cc3300",
      "12": "#004488",
    });
  });

  it("isoliert die Einstellung benutzerweise — Benutzer B sieht nicht die Werte von Benutzer A", async () => {
    const userA = await createDispatcherAgent("scope-a");
    const userB = await createDispatcherAgent("scope-b");
    await setUserSetting(userA, "calendar.tourHeaderTextColors", { "3": "#aabbcc" });
    const settingsB = await getResolvedSettings(userB);
    expect(getSetting(settingsB, "calendar.tourHeaderTextColors").resolvedValue).toEqual({});
  });

  it("lehnt ungültige Hex-Farb-Werte ab", async () => {
    const user = await createDispatcherAgent("invalid-hex");
    const settings = await getResolvedSettings(user);
    const setting = getSetting(settings, "calendar.tourHeaderTextColors");
    const version = typeof setting.userVersion === "number" && setting.userVersion >= 1
      ? setting.userVersion
      : 1;
    await user
      .patch("/api/user-settings")
      .send({
        key: "calendar.tourHeaderTextColors",
        scopeType: "USER",
        version,
        value: { "7": "red" },
      })
      .expect(400);
  });

  it("lehnt nicht-numerische Schlüssel ab", async () => {
    const user = await createDispatcherAgent("invalid-key");
    const settings = await getResolvedSettings(user);
    const setting = getSetting(settings, "calendar.tourHeaderTextColors");
    const version = typeof setting.userVersion === "number" && setting.userVersion >= 1
      ? setting.userVersion
      : 1;
    await user
      .patch("/api/user-settings")
      .send({
        key: "calendar.tourHeaderTextColors",
        scopeType: "USER",
        version,
        value: { "abc": "#ff0000" },
      })
      .expect(400);
  });
});
