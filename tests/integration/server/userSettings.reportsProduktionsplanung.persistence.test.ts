/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die FT26-Produktionsplanung speichert pro Benutzer nur noch useShortCodes im neuen Selection-Key.
 * - Die neuen Range-Settings fuer Vorlaufliste und Produktionsplanung bleiben ueber Reloads user-spezifisch erhalten.
 * - Die Auftragsliste speichert Kategorieauswahl, Shortcodes und Range user-spezifisch.
 * - Der Legacy-Key reports.productVorlauf.selection bleibt als aufgeloester Fallback lesbar.
 *
 * Fehlerfaelle:
 * - Scope-Leak zwischen zwei Benutzern.
 * - Range- oder Shortcode-Konfiguration geht nach Reload verloren.
 * - Auftragslisten-Kategorien oder Datums-/KW-Werte gehen nach Reload verloren.
 * - Der Legacy-Fallback verschwindet aus den aufgeloesten Settings.
 *
 * Ziel:
 * Die user-spezifische FT26-Settings-Persistenz auf API-Ebene absichern.
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
  const username = `test-ft26-setting-${label}-${userCounter}`;
  userCounter += 1;
  const password = `test-ft26-setting-password-${label}`;
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

async function patchUserSetting(agent: SuperAgentTest, key: string, value: unknown): Promise<void> {
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

describe("integration: FT26 report settings persistence", () => {
  it("persists the slim produktionsplanung selection user-specifically", async () => {
    const userA = await createDispatcherAgent("a");
    const userB = await createDispatcherAgent("b");

    await patchUserSetting(userA, "reports.produktionsplanung.selection", {
      useShortCodes: true,
    });

    const settingsA = await getResolvedSettings(userA);
    const settingsB = await getResolvedSettings(userB);

    expect(getSetting(settingsA, "reports.produktionsplanung.selection").resolvedValue).toEqual({
      useShortCodes: true,
    });
    expect(getSetting(settingsB, "reports.produktionsplanung.selection").resolvedValue).toEqual({
      useShortCodes: false,
    });
  });

  it("persists the new range settings across reloads", async () => {
    const user = await createDispatcherAgent("range");

    await patchUserSetting(user, "reports.vorlaufliste.rangeConfig", {
      activeTab: "date",
      fromDate: "2026-04-06",
      toDate: "2026-05-08",
      kwStart: 17,
      weekCount: 3,
    });
    await patchUserSetting(user, "reports.produktionsplanung.rangeConfig", {
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 21,
      weekCount: 2,
    });

    const reloaded = await getResolvedSettings(user);

    expect(getSetting(reloaded, "reports.vorlaufliste.rangeConfig").resolvedValue).toEqual({
      activeTab: "date",
      fromDate: "2026-04-06",
      toDate: "2026-05-08",
      kwStart: 17,
      weekCount: 3,
    });
    expect(getSetting(reloaded, "reports.produktionsplanung.rangeConfig").resolvedValue).toEqual({
      activeTab: "calendarWeek",
      fromDate: "2026-04-07",
      toDate: "2026-05-09",
      kwStart: 21,
      weekCount: 2,
    });
  });

  it("persists the auftragsliste selection and range settings across reloads", async () => {
    const user = await createDispatcherAgent("auftragsliste");

    await patchUserSetting(user, "reports.auftragsliste.selection", {
      productCategoryIds: [11, 12],
      componentCategoryIds: [21, 34],
      useShortCodes: true,
    });
    await patchUserSetting(user, "reports.auftragsliste.rangeConfig", {
      activeTab: "calendarWeek",
      fromDate: "2026-04-08",
      toDate: "2026-05-10",
      kwStart: 22,
      weekCount: 4,
    });

    const reloaded = await getResolvedSettings(user);

    expect(getSetting(reloaded, "reports.auftragsliste.selection").resolvedValue).toEqual({
      productCategoryIds: [11, 12],
      componentCategoryIds: [21, 34],
      useShortCodes: true,
    });
    expect(getSetting(reloaded, "reports.auftragsliste.rangeConfig").resolvedValue).toEqual({
      activeTab: "calendarWeek",
      fromDate: "2026-04-08",
      toDate: "2026-05-10",
      kwStart: 22,
      weekCount: 4,
    });
  });

  it("keeps the legacy produktvorlauf selection readable as resolved fallback data", async () => {
    const user = await createDispatcherAgent("legacy");

    await patchUserSetting(user, "reports.productVorlauf.selection", {
      productCategoryIds: [11, 12],
      componentCategoryIds: [21],
      useShortCodes: true,
      sonderblockTagIds: [31],
    });

    const reloaded = await getResolvedSettings(user);

    expect(getSetting(reloaded, "reports.productVorlauf.selection").resolvedValue).toEqual({
      productCategoryIds: [11, 12],
      componentCategoryIds: [21],
      useShortCodes: true,
      sonderblockTagIds: [31],
    });
  });
});
