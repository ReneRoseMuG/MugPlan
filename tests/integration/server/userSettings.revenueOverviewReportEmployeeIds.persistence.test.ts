/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Express-App mit registrierten Routen, echte MySQL-Testdatenbank, echte Auth/Session,
 *   echtes User-Settings-System (GET /api/user-settings/resolved, PATCH /api/user-settings).
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Klasse B / Baseline core / Storage none. Eindeutige Benutzer-Tokens (rovr-...) je Test gegen Restdaten.
 *
 * Abgedeckte Regeln:
 * - Standardwert von revenueOverviewReport.employeeIds ist eine leere Liste.
 * - Eine gespeicherte Mitarbeiter-ID-Liste bleibt nach erneutem Laden erhalten (USER-Scope).
 * - Die Auswahl ist pro Benutzer getrennt (Benutzer B sieht die Auswahl von Benutzer A nicht).
 * - Ungültige Werte (Duplikate, nicht-positive) werden abgelehnt; ohne Auth wird abgelehnt.
 *
 * Fehlerfälle:
 * - Scope-Leak zwischen Benutzern.
 * - Persistierter Wert geht beim erneuten Laden verloren.
 * - Ungültige Listen werden akzeptiert.
 * - Unauthentifizierter Zugriff wird zugelassen.
 *
 * Ziel:
 * Die benutzerbezogene Persistenz der Umsatz-Report-Mitarbeiterauswahl auf API-Ebene absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

const SETTING_KEY = "revenueOverviewReport.employeeIds";

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
  const username = `test-dispatcher-rovr-${label}-${userCounter}`;
  const password = `test-password-rovr-${label}`;
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

async function setUserSetting(agent: SuperAgentTest, value: unknown): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, SETTING_KEY);
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1
    ? setting.userVersion
    : 1;
  await agent
    .patch("/api/user-settings")
    .send({ key: SETTING_KEY, scopeType: "USER", version, value })
    .expect(200);
}

async function expectPatchStatus(agent: SuperAgentTest, value: unknown, status: number): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, SETTING_KEY);
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1
    ? setting.userVersion
    : 1;
  await agent
    .patch("/api/user-settings")
    .send({ key: SETTING_KEY, scopeType: "USER", version, value })
    .expect(status);
}

describe("revenueOverviewReport.employeeIds integration: USER-Scope-Persistenz", () => {
  it("liefert eine leere Liste als Standardwert für neue Benutzer", async () => {
    const user = await createDispatcherAgent("default");
    const settings = await getResolvedSettings(user);
    expect(getSetting(settings, SETTING_KEY).resolvedValue).toEqual([]);
  });

  it("persistiert eine Mitarbeiter-ID-Liste und stellt sie nach erneutem Laden bereit", async () => {
    const user = await createDispatcherAgent("persist");
    await setUserSetting(user, [12, 7, 33]);
    const settings = await getResolvedSettings(user);
    expect(getSetting(settings, SETTING_KEY).resolvedValue).toEqual([12, 7, 33]);
  });

  it("isoliert die Auswahl benutzerweise — Benutzer B sieht nicht die Auswahl von Benutzer A", async () => {
    const userA = await createDispatcherAgent("scope-a");
    const userB = await createDispatcherAgent("scope-b");
    await setUserSetting(userA, [5, 6]);
    const settingsB = await getResolvedSettings(userB);
    expect(getSetting(settingsB, SETTING_KEY).resolvedValue).toEqual([]);
  });

  it("lehnt doppelte IDs ab", async () => {
    const user = await createDispatcherAgent("dup");
    await expectPatchStatus(user, [4, 4], 400);
  });

  it("lehnt nicht-positive Werte ab", async () => {
    const user = await createDispatcherAgent("neg");
    await expectPatchStatus(user, [0], 400);
  });

  it("lehnt unauthentifizierte Zugriffe auf die Settings ab", async () => {
    await request(app).get("/api/user-settings/resolved").expect(401);
  });
});
