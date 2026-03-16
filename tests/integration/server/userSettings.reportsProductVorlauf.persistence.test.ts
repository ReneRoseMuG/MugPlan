/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Produkt-Vorlauf-Konfiguration wird pro Benutzer getrennt gespeichert.
 * - Persistierte Kategorie-IDs und Sondermass-Tag-ID bleiben ueber erneutes Laden erhalten.
 *
 * Fehlerfaelle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Verlust der Produkt-Vorlauf-Konfiguration nach Reload.
 *
 * Ziel:
 * Die benutzerspezifische Persistenz der Produkt-Vorlauf-Konfiguration auf API-Ebene absichern.
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
  userCounter = 1;
});

async function createDispatcherAgent(label: string): Promise<SuperAgentTest> {
  const username = `test-product-vorlauf-setting-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-product-vorlauf-setting-password-${label}`;
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

async function setUserSetting(
  agent: SuperAgentTest,
  value: { productCategoryIds: number[]; componentCategoryIds: number[]; specialMeasureTagId: number | null },
): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, "reports.productVorlauf.selection");
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1 ? setting.userVersion : 1;

  await agent
    .patch("/api/user-settings")
    .send({
      key: "reports.productVorlauf.selection",
      scopeType: "USER",
      version,
      value,
    })
    .expect(200);
}

describe("integration: reports product vorlauf selection persistence", () => {
  it("persists the configuration user-specifically and keeps values across reload", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await setUserSetting(userA, {
      productCategoryIds: [11, 12],
      componentCategoryIds: [21, 22],
      specialMeasureTagId: 33,
    });

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "reports.productVorlauf.selection").resolvedValue).toEqual({
      productCategoryIds: [11, 12],
      componentCategoryIds: [21, 22],
      specialMeasureTagId: 33,
    });
    expect(getSetting(settingsB, "reports.productVorlauf.selection").resolvedValue).toEqual({
      productCategoryIds: [],
      componentCategoryIds: [],
      specialMeasureTagId: null,
    });

    const reloadedA = await getResolvedSettings(userA);
    expect(getSetting(reloadedA, "reports.productVorlauf.selection").resolvedValue).toEqual({
      productCategoryIds: [11, 12],
      componentCategoryIds: [21, 22],
      specialMeasureTagId: 33,
    });
  });
});
