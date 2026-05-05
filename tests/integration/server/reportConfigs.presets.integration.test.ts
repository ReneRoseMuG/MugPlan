/**
 * Test Scope:
 *
 * Feature: Report-Presets mit USER- und GLOBAL-Scope
 *
 * Abgedeckte Regeln:
 * - Alle Report-Leserollen können eigene USER-Presets speichern, lesen und löschen.
 * - USER-Presets bleiben strikt beim jeweiligen Benutzer.
 * - GLOBAL-Presets sind für alle Rollen lesbar, aber nur ADMIN kann sie schreiben oder löschen.
 * - Produktionsplanungs-Layouts dürfen Bestandteil eines Presets sein.
 *
 * Fehlerfälle:
 * - Ein Leser sieht fremde USER-Presets.
 * - DISPONENT oder LESER können globale Presets verändern.
 * - Presets werden nicht über den echten API- und Filesystem-Pfad persistiert.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-report-configs-${authCounter}`;
  authCounter += 1;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: `test-${token}`,
    email: `test-${token}@local.test`,
    firstName: "Test",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return loginAgent(app, { username: `test-${token}`, password });
}

describe("integration: report config presets endpoint", () => {
  it("persists USER presets for a reader without exposing them to other users", async () => {
    const firstReader = await createRoleAgent("READER");
    const secondReader = await createRoleAgent("READER");
    const presetId = "ft26-reader-user-preset";

    await firstReader
      .put(`/api/report-configs/vorlaufliste/presets/${presetId}`)
      .send({
        name: "Meine Vorlauf-KW",
        scope: "USER",
        config: {
          range: { mode: "calendarWeek", start: "current", weeks: 2 },
          activeTab: "calendarWeek",
          useShortCodes: true,
          columnOrder: ["projectName", "actualDate"],
          hiddenColumns: ["notesCount"],
        },
        actions: ["GENERATE_REPORT", "OPEN_PRINT_PREVIEW"],
      })
      .expect(200);

    const ownResponse = await firstReader.get("/api/report-configs/vorlaufliste").expect(200);
    expect(ownResponse.body.presets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: presetId,
        reportKey: "vorlaufliste",
        scope: "USER",
        name: "Meine Vorlauf-KW",
        config: expect.objectContaining({
          range: { mode: "calendarWeek", start: "current", weeks: 2 },
          useShortCodes: true,
        }),
        actions: ["GENERATE_REPORT", "OPEN_PRINT_PREVIEW"],
      }),
    ]));

    const otherResponse = await secondReader.get("/api/report-configs/vorlaufliste").expect(200);
    expect(otherResponse.body.presets.some((preset: { id: string }) => preset.id === presetId)).toBe(false);

    await firstReader.delete(`/api/report-configs/vorlaufliste/presets/${presetId}`).query({ scope: "USER" }).expect(200);
  });

  it("allows admins to publish GLOBAL production-planning presets with layout and blocks other roles from global writes", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");
    const presetId = "ft26-global-produktionsplanung-layout";

    await admin
      .put(`/api/report-configs/produktionsplanung/presets/${presetId}`)
      .send({
        name: "Globales Produktionsplanung-Layout",
        scope: "GLOBAL",
        config: {
          range: { mode: "calendarWeek", start: "next", weeks: 1 },
          activeTab: "columns",
          useShortCodes: false,
          productCategoryIds: [1],
          componentCategoryIds: [2],
          categoryLayout: [
            { categoryId: 1, block: 1, columns: 2 },
            { categoryId: 2, block: 2, columns: 1 },
          ],
        },
        actions: ["GENERATE_REPORT"],
      })
      .expect(200);

    const readerResponse = await reader.get("/api/report-configs/produktionsplanung").expect(200);
    expect(readerResponse.body.presets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: presetId,
        reportKey: "produktionsplanung",
        scope: "GLOBAL",
        config: expect.objectContaining({
          categoryLayout: [
            { categoryId: 1, block: 1, columns: 2 },
            { categoryId: 2, block: 2, columns: 1 },
          ],
        }),
      }),
    ]));

    await dispatcher
      .put(`/api/report-configs/produktionsplanung/presets/${presetId}-blocked`)
      .send({
        name: "Nicht erlaubt",
        scope: "GLOBAL",
        config: {
          range: { mode: "calendarWeek", start: "current", weeks: 1 },
        },
        actions: [],
      })
      .expect(403);

    await reader.delete(`/api/report-configs/produktionsplanung/presets/${presetId}`).query({ scope: "GLOBAL" }).expect(403);
    await admin.delete(`/api/report-configs/produktionsplanung/presets/${presetId}`).query({ scope: "GLOBAL" }).expect(200);
  });

  it("validates report keys and preset ids before touching persistence", async () => {
    const admin = await loginAdminAgent(app);

    await admin
      .put("/api/report-configs/unbekannt/presets/ft26-invalid-report")
      .send({
        name: "Ungültig",
        scope: "USER",
        config: {
          range: { mode: "calendarWeek", start: "current", weeks: 1 },
        },
        actions: [],
      })
      .expect(422);

    await admin
      .put("/api/report-configs/vorlaufliste/presets/bad:id")
      .send({
        name: "Ungültig",
        scope: "USER",
        config: {
          range: { mode: "calendarWeek", start: "current", weeks: 1 },
        },
        actions: [],
      })
      .expect(422);
  });
});
