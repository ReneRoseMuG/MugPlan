/**
 * Test Scope:
 *
 * Feature: Report-Presets mit ausschließlich benutzereigenem Scope
 *
 * Abgedeckte Regeln:
 * - Alle Report-Rollen können eigene USER-Presets speichern, lesen und löschen.
 * - USER-Presets bleiben strikt beim jeweiligen Benutzer.
 * - GLOBAL-Scope wird im Preset-Endpoint nicht mehr akzeptiert.
 * - Produktionsplanungs-Layouts dürfen Bestandteil eines USER-Presets sein.
 * - Preset-Aktionen werden nicht mehr persistiert.
 *
 * Fehlerfälle:
 * - Ein Nutzer sieht fremde USER-Presets.
 * - GLOBAL-Presets können weiterhin geschrieben oder gelöscht werden.
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
  it("persists USER presets for all report roles and drops preset actions", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    for (const [roleLabel, agent] of [
      ["admin", admin],
      ["dispatcher", dispatcher],
      ["reader", reader],
    ] as const) {
      const presetId = `ft26-${roleLabel}-user-preset-${authCounter}`;
      authCounter += 1;

      const response = await agent
        .put(`/api/report-configs/produktionsplanung/presets/${presetId}`)
        .send({
          name: `Preset ${roleLabel}`,
          config: {
            range: { mode: "calendarWeek", start: 1, weeks: 2 },
            activeTab: "calendarWeek",
            useShortCodes: true,
            productCategoryIds: [1],
            componentCategoryIds: [2],
            categoryLayout: [
              { categoryId: 1, block: 1, columns: 2 },
              { categoryId: 2, block: 2, columns: 1 },
            ],
          },
          actions: ["GENERATE_REPORT", "OPEN_PRINT_PREVIEW"],
        })
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: presetId,
        reportKey: "produktionsplanung",
        scope: "USER",
        actions: [],
        config: expect.objectContaining({
          range: { mode: "calendarWeek", start: 1, weeks: 2 },
          categoryLayout: [
            { categoryId: 1, block: 1, columns: 2 },
            { categoryId: 2, block: 2, columns: 1 },
          ],
        }),
      }));

      const ownResponse = await agent.get("/api/report-configs/produktionsplanung").expect(200);
      expect(ownResponse.body.presets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: presetId,
          scope: "USER",
          actions: [],
        }),
      ]));

      await agent.delete(`/api/report-configs/produktionsplanung/presets/${presetId}`).expect(200);
      const afterDeleteResponse = await agent.get("/api/report-configs/produktionsplanung").expect(200);
      expect(afterDeleteResponse.body.presets.some((preset: { id: string }) => preset.id === presetId)).toBe(false);
    }
  });

  it("does not expose USER presets to other users", async () => {
    const firstReader = await createRoleAgent("READER");
    const secondReader = await createRoleAgent("READER");
    const presetId = `ft26-reader-user-preset-${authCounter}`;
    authCounter += 1;

    await firstReader
      .put(`/api/report-configs/vorlaufliste/presets/${presetId}`)
      .send({
        name: "Meine Vorlauf-KW",
        config: {
          range: { mode: "calendarWeek", start: 1, weeks: 2 },
          activeTab: "calendarWeek",
          useShortCodes: true,
          columnOrder: ["projectName", "actualDate"],
          hiddenColumns: ["notesCount"],
        },
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
          range: { mode: "calendarWeek", start: 1, weeks: 2 },
          useShortCodes: true,
        }),
        actions: [],
      }),
    ]));

    const otherResponse = await secondReader.get("/api/report-configs/vorlaufliste").expect(200);
    expect(otherResponse.body.presets.some((preset: { id: string }) => preset.id === presetId)).toBe(false);

    await firstReader.delete(`/api/report-configs/vorlaufliste/presets/${presetId}`).expect(200);
  });

  it("rejects GLOBAL preset scope for writes and deletes", async () => {
    const admin = await loginAdminAgent(app);
    const presetId = `ft26-global-rejected-${authCounter}`;
    authCounter += 1;

    const globalWriteResponse = await admin
      .put(`/api/report-configs/produktionsplanung/presets/${presetId}`)
      .send({
        name: "Global nicht mehr erlaubt",
        scope: "GLOBAL",
        config: {
          range: { mode: "calendarWeek", start: 1, weeks: 1 },
        },
      })
      .expect(422);
    expect(globalWriteResponse.body.message).toContain("Globale Presets sind deaktiviert");

    const globalDeleteResponse = await admin
      .delete(`/api/report-configs/produktionsplanung/presets/${presetId}`)
      .query({ scope: "GLOBAL" })
      .expect(422);
    expect(globalDeleteResponse.body.message).toContain("Globale Presets sind deaktiviert");
  });

  it("validates report keys and preset ids before touching persistence", async () => {
    const admin = await loginAdminAgent(app);

    await admin
      .put("/api/report-configs/unbekannt/presets/ft26-invalid-report")
      .send({
        name: "Ungültig",
        config: {
          range: { mode: "calendarWeek", start: 1, weeks: 1 },
        },
      })
      .expect(422);

    await admin
      .put("/api/report-configs/vorlaufliste/presets/bad:id")
      .send({
        name: "Ungültig",
        config: {
          range: { mode: "calendarWeek", start: 1, weeks: 1 },
        },
      })
      .expect(422);
  });
});
