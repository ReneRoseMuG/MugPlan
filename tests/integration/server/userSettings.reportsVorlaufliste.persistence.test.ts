/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Vorlaufliste-Spaltenkonfiguration wird pro Benutzer getrennt gespeichert.
 * - Persistierte columnOrder, hiddenColumns, columnWidths und useShortCodes bleiben über Reloads stabil.
 * - Legacy-Felder aus dem alten Setting-Shape werden serverseitig aus dem resolved Setting herausnormalisiert.
 *
 * Fehlerfälle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Verlust oder Vermischung persistierter Spaltenkonfiguration nach Reload.
 * - Alte productCategoryIds/componentCategoryIds tauchen weiterhin im resolved Setting auf.
 *
 * Ziel:
 * Die benutzerspezifische Persistenz der neuen Vorlaufliste-Spaltenkonfiguration auf API-Ebene absichern.
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
  const username = `test-reports-setting-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-reports-setting-password-${label}`;
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

async function patchUserSetting(agent: SuperAgentTest, value: Record<string, unknown>): Promise<void> {
  const settings = await getResolvedSettings(agent);
  const setting = getSetting(settings, "reports.vorlaufliste.categorySelection");
  const version = typeof setting.userVersion === "number" && setting.userVersion >= 1 ? setting.userVersion : 1;

  await agent
    .patch("/api/user-settings")
    .send({
      key: "reports.vorlaufliste.categorySelection",
      scopeType: "USER",
      version,
      value,
    })
    .expect(200);
}

describe("integration: reports vorlaufliste column configuration persistence", () => {
  it("persists the user-specific column configuration across reloads", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await patchUserSetting(userA, {
      columnOrder: ["amount", "city", "product-11"],
      hiddenColumns: ["component-21"],
      columnWidths: {
        amount: 180,
        "product-11": 320,
      },
      useShortCodes: true,
    });

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "reports.vorlaufliste.categorySelection").resolvedValue).toEqual({
      columnOrder: ["amount", "city", "product-11"],
      hiddenColumns: ["component-21"],
      columnWidths: {
        amount: 180,
        "product-11": 320,
      },
      useShortCodes: true,
    });
    expect(getSetting(settingsB, "reports.vorlaufliste.categorySelection").resolvedValue).toEqual({});

    const reloadedA = await getResolvedSettings(userA);
    expect(getSetting(reloadedA, "reports.vorlaufliste.categorySelection").resolvedValue).toEqual({
      columnOrder: ["amount", "city", "product-11"],
      hiddenColumns: ["component-21"],
      columnWidths: {
        amount: 180,
        "product-11": 320,
      },
      useShortCodes: true,
    });
  });

  it("normalizes legacy category fields out of the resolved setting", async () => {
    const user = await createDispatcherAgent("legacy");

    await patchUserSetting(user, {
      productCategoryIds: [11, 12],
      componentCategoryIds: [21],
      columnOrder: ["amount", "city"],
      hiddenColumns: ["component-21"],
      useShortCodes: false,
    });

    const settings = await getResolvedSettings(user);

    expect(getSetting(settings, "reports.vorlaufliste.categorySelection").resolvedValue).toEqual({
      columnOrder: ["amount", "city"],
      hiddenColumns: ["component-21"],
      columnWidths: undefined,
      useShortCodes: false,
    });
  });
});
