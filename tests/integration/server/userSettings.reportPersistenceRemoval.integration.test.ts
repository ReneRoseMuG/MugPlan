/**
 * Test Scope:
 *
 * Feature: Report-Konfigurationen werden nicht mehr still über User-Settings persistiert
 *
 * Abgedeckte Regeln:
 * - Resolved settings enthalten keine alten reportbezogenen User-Settings mehr.
 * - Schreibversuche auf alte Report-Keys werden serverseitig abgewiesen.
 * - reports.categoryLayout bleibt als globales Produktionsplanungs-Layout erhalten.
 *
 * Fehlerfälle:
 * - Alte Report-Settings werden weiter ausgeliefert und können die UI still vorbelegen.
 * - Alte Report-Settings lassen sich weiterhin per API schreiben.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("integration: report settings persistence removal", () => {
  it("exposes only reports.categoryLayout and rejects old report setting writes", async () => {
    const admin = await loginAdminAgent(app);
    const resolvedResponse = await admin.get("/api/user-settings/resolved").expect(200);
    const reportKeys = (resolvedResponse.body as Array<{ key: string }>)
      .map((setting) => setting.key)
      .filter((key) => key.startsWith("reports."));

    expect(reportKeys).toEqual(["reports.categoryLayout"]);

    await admin
      .patch("/api/user-settings")
      .send({
        key: "reports.vorlaufliste.rangeConfig",
        scopeType: "USER",
        version: 1,
        value: {
          activeTab: "calendarWeek",
          kwStart: 18,
          weekCount: 2,
        },
      })
      .expect(400);
  });
});
